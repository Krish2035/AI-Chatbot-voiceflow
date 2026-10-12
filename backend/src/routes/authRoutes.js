import express from 'express';
import {
  registerUser,
  loginUser,
  authenticateWithGoogle,
  getUserById
} from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register with email, password, and displayName
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await registerUser({ email, password, displayName });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(400).json({
      error: 'Registration failed',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Log in with email and password
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await loginUser({ email, password });
    return res.json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(401).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/google
 * Authenticate or register using Firebase Google Sign-In
 */
router.post('/google', async (req, res) => {
  try {
    const { email, displayName, photoUrl, firebaseUid } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google account email is required.' });
    }

    const result = await authenticateWithGoogle({
      email,
      displayName,
      photoUrl,
      firebaseUid
    });

    return res.json({
      success: true,
      message: 'Google authentication successful',
      ...result
    });
  } catch (error) {
    console.error('Google Auth error:', error.message);
    return res.status(500).json({
      error: 'Google authentication failed',
      details: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Fetch current authenticated user's profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Fetch me error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * POST /api/auth/logout
 * Client-side token termination
 */
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
