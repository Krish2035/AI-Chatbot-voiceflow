import {
  initDrizzle,
  getDrizzleStatus,
  getWriteDb,
  getReadDb,
  inMemoryStore
} from '../db/drizzle.js';
import { sql } from 'drizzle-orm';

export const initDB = async () => {
  return initDrizzle();
};

export const getDBStatus = () => {
  const status = getDrizzleStatus();
  return {
    connected: status.primaryConnected,
    type: status.engine,
    readReplicaActive: status.readReplicaActive,
    readRouting: status.readRouting,
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'voiceflow_db'
  };
};

export const query = async (text, params = []) => {
  const db = getWriteDb();
  if (!db) {
    throw new Error('Database not connected');
  }

  // Parameterized query execution
  let queryText = text;
  if (params && params.length > 0) {
    params.forEach((param, index) => {
      const placeholder = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
      const val = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : param;
      queryText = queryText.replace(placeholder, String(val));
    });
  }

  const result = await db.execute(sql.raw(queryText));
  return {
    rows: result.rows || [],
    rowCount: result.rowCount || 0
  };
};

export { inMemoryStore };

export default {
  initDB,
  getDBStatus,
  query,
  inMemoryStore
};
