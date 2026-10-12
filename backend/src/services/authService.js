import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getWriteDb, inMemoryStore, getDrizzleStatus, schema } from '../db/drizzle.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'voiceflow_default_secret_key_change_in_production_32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      authProvider: user.authProvider
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Register a new user with email and password
 */
export const registerUser = async ({ email, password, displayName }) => {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = (displayName || cleanEmail.split('@')[0]).trim();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const drizzleStatus = getDrizzleStatus();

  if (drizzleStatus.primaryConnected) {
    const db = getWriteDb();
    // Check if user already exists
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));
    if (existing.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const inserted = await db.insert(schema.users).values({
      email: cleanEmail,
      passwordHash,
      displayName: cleanName,
      authProvider: 'local'
    }).returning();

    const user = inserted[0];
    const token = generateAccessToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider
      },
      token
    };
  }

  // Fallback to In-Memory Engine
  if (inMemoryStore.usersByEmail.has(cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const newId = inMemoryStore.users.size + 1;
  const user = {
    id: newId,
    email: cleanEmail,
    passwordHash,
    displayName: cleanName,
    avatarUrl: null,
    authProvider: 'local',
    createdAt: new Date().toISOString()
  };

  inMemoryStore.users.set(newId, user);
  inMemoryStore.usersByEmail.set(cleanEmail, user);

  const token = generateAccessToken(user);
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider
    },
    token
  };
};

/**
 * Authenticate user with email & password
 */
export const loginUser = async ({ email, password }) => {
  const cleanEmail = email.toLowerCase().trim();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required');
  }

  const drizzleStatus = getDrizzleStatus();

  let user = null;

  if (drizzleStatus.primaryConnected) {
    const db = getWriteDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));
    if (rows.length === 0) {
      throw new Error('Invalid email or password.');
    }
    user = rows[0];
  } else {
    user = inMemoryStore.usersByEmail.get(cleanEmail);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
  }

  if (!user.passwordHash) {
    throw new Error('This account was created with Google. Please use Continue with Google.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const token = generateAccessToken(user);
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider
    },
    token
  };
};

/**
 * Authenticate or Register via Google Firebase Authentication
 */
export const authenticateWithGoogle = async ({ email, displayName, photoUrl, firebaseUid }) => {
  if (!email) {
    throw new Error('Google authentication requires an email.');
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = displayName || cleanEmail.split('@')[0];
  const drizzleStatus = getDrizzleStatus();

  let user = null;

  if (drizzleStatus.primaryConnected) {
    const db = getWriteDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, cleanEmail));

    if (rows.length > 0) {
      // Update existing user with Google credentials
      const updated = await db.update(schema.users)
        .set({
          firebaseUid: firebaseUid || rows[0].firebaseUid,
          avatarUrl: photoUrl || rows[0].avatarUrl,
          displayName: cleanName || rows[0].displayName,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, rows[0].id))
        .returning();
      user = updated[0];
    } else {
      // Create new Google user
      const created = await db.insert(schema.users).values({
        email: cleanEmail,
        displayName: cleanName,
        avatarUrl: photoUrl,
        authProvider: 'google',
        firebaseUid
      }).returning();
      user = created[0];
    }
  } else {
    // In-memory fallback
    user = inMemoryStore.usersByEmail.get(cleanEmail);
    if (user) {
      user.avatarUrl = photoUrl || user.avatarUrl;
      user.displayName = cleanName || user.displayName;
      user.firebaseUid = firebaseUid || user.firebaseUid;
    } else {
      const newId = inMemoryStore.users.size + 1;
      user = {
        id: newId,
        email: cleanEmail,
        displayName: cleanName,
        avatarUrl: photoUrl,
        authProvider: 'google',
        firebaseUid,
        createdAt: new Date().toISOString()
      };
      inMemoryStore.users.set(newId, user);
      inMemoryStore.usersByEmail.set(cleanEmail, user);
    }
  }

  const token = generateAccessToken(user);
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider
    },
    token
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  const drizzleStatus = getDrizzleStatus();
  if (drizzleStatus.primaryConnected) {
    const db = getWriteDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    if (rows.length === 0) return null;
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      authProvider: u.authProvider
    };
  }
  const u = inMemoryStore.users.get(userId);
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    authProvider: u.authProvider
  };
};

export default {
  registerUser,
  loginUser,
  authenticateWithGoogle,
  getUserById,
  generateAccessToken,
  verifyAccessToken
};
