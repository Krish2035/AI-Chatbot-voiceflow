import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let writePool = null;
let readPool = null;
let writeDb = null;
let readDb = null;

let isPrimaryConnected = false;
let isReplicaConnected = false;

// Robust In-Memory Store fallback when Postgres is not available
export const inMemoryStore = {
  users: new Map(),         // id -> user object
  usersByEmail: new Map(),  // email -> user object
  conversations: new Map(), // id -> { id, user_id, title, created_at, updated_at }
  messages: new Map()       // id -> [ { id, conversation_id, sender, content, created_at } ]
};

/**
 * Configure PostgreSQL connection configs for Primary and Read Replicas
 */
const getPrimaryConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000,
      max: 20
    };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'voiceflow_db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    connectionTimeoutMillis: 3000,
    max: 20
  };
};

const getReplicaConfig = () => {
  if (process.env.DATABASE_READ_REPLICA_URL) {
    return {
      connectionString: process.env.DATABASE_READ_REPLICA_URL,
      ssl: process.env.DATABASE_READ_REPLICA_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000,
      max: 30
    };
  }
  if (process.env.PG_REPLICA_HOST && process.env.PG_REPLICA_HOST !== process.env.PGHOST) {
    return {
      host: process.env.PG_REPLICA_HOST,
      port: parseInt(process.env.PG_REPLICA_PORT || '5433', 10),
      database: process.env.PG_REPLICA_DATABASE || process.env.PGDATABASE || 'voiceflow_db',
      user: process.env.PG_REPLICA_USER || process.env.PGUSER || 'postgres',
      password: process.env.PG_REPLICA_PASSWORD || process.env.PGPASSWORD || 'postgres',
      connectionTimeoutMillis: 3000,
      max: 30
    };
  }
  return null; // No separate replica, reads route to primary
};

/**
 * Initialize Drizzle ORM with Read Replica routing
 */
export const initDrizzle = async () => {
  // 1. Primary Write Node
  try {
    const primaryConfig = getPrimaryConfig();
    writePool = new Pool(primaryConfig);

    const client = await writePool.connect();
    isPrimaryConnected = true;
    writeDb = drizzle(writePool, { schema });
    console.log('✅ Drizzle ORM connected to Primary (Write) Database');

    // Create Tables if not exist & Add Search Indexes
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        display_name VARCHAR(150) NOT NULL,
        avatar_url TEXT,
        auth_provider VARCHAR(30) DEFAULT 'local' NOT NULL,
        firebase_uid VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Index for fast user conversation lookups
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      
      -- Composite Index for fast conversation thread ordering
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at ASC);

      -- Search Indexing: Full Text & Trigram Search index on message content
      CREATE INDEX IF NOT EXISTS idx_messages_content_tsv ON messages USING gin(to_tsvector('english', content));
    `);

    client.release();
    console.log('✅ PostgreSQL Schema & Search Indexes initialized');
  } catch (err) {
    console.warn(`⚠️ Primary Database notice: ${err.message}`);
    console.log('💡 Running with In-Memory data engine fallback (seamless local testing).');
    isPrimaryConnected = false;
  }

  // 2. Read Replica Node
  const replicaConfig = getReplicaConfig();
  if (replicaConfig) {
    try {
      readPool = new Pool(replicaConfig);
      const repClient = await readPool.connect();
      isReplicaConnected = true;
      readDb = drizzle(readPool, { schema });
      repClient.release();
      console.log('✅ Drizzle ORM connected to Read Replica Database (Read-scaling active)');
    } catch (repErr) {
      console.warn(`ℹ️ Read replica not reachable (${repErr.message}). Routing all reads to Primary.`);
      readPool = writePool;
      readDb = writeDb;
      isReplicaConnected = false;
    }
  } else {
    // Reads naturally route to primary pool
    readPool = writePool;
    readDb = writeDb;
    isReplicaConnected = isPrimaryConnected;
  }

  return {
    writeDb,
    readDb,
    isPrimaryConnected,
    isReplicaConnected
  };
};

/**
 * Get Primary Write DB (Drizzle ORM)
 */
export const getWriteDb = () => writeDb;

/**
 * Get Read Replica DB (Drizzle ORM)
 */
export const getReadDb = () => readDb || writeDb;

/**
 * Connection Status
 */
export const getDrizzleStatus = () => ({
  primaryConnected: isPrimaryConnected,
  readReplicaActive: isReplicaConnected,
  engine: isPrimaryConnected ? 'PostgreSQL (Drizzle ORM)' : 'In-Memory Engine',
  readRouting: isReplicaConnected ? 'Split (Write -> Primary, Read -> Replica)' : 'Direct to Primary / In-Memory'
});

export { schema };
export default {
  initDrizzle,
  getWriteDb,
  getReadDb,
  getDrizzleStatus,
  inMemoryStore,
  schema
};
