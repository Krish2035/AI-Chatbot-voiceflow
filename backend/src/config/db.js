import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool = null;
let isDbConnected = false;

// In-memory fallback storage in case PostgreSQL is offline
export const inMemoryStore = {
  conversations: new Map(), // id -> { id, title, created_at, updated_at }
  messages: new Map()       // id -> [ { id, conversation_id, sender, content, created_at } ]
};

export const initDB = async () => {
  try {
    pool = new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'voiceflow_db',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      connectionTimeoutMillis: 3000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    isDbConnected = true;

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE CASCADE,
        sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for faster memory context lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
      ON messages(conversation_id, created_at ASC);
    `);

    client.release();
    console.log('✅ PostgreSQL schema initialized');
  } catch (error) {
    console.warn(`⚠️ PostgreSQL connection warning: ${error.message}`);
    console.log('💡 Operating with in-memory memory store. (To persist to Postgres, check your .env settings and ensure PostgreSQL server is running).');
    isDbConnected = false;
  }
};

export const getDBStatus = () => ({
  connected: isDbConnected,
  type: isDbConnected ? 'PostgreSQL' : 'In-Memory Store',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'voiceflow_db'
});

export const query = async (text, params) => {
  if (!isDbConnected || !pool) {
    throw new Error('Database not connected');
  }
  return pool.query(text, params);
};

export default {
  initDB,
  getDBStatus,
  query,
  inMemoryStore
};
