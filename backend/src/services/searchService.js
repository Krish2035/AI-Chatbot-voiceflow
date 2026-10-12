import { getReadDb, inMemoryStore, getDrizzleStatus } from '../db/drizzle.js';
import { sql } from 'drizzle-orm';
import { cacheGet, cacheSet } from './redisService.js';
import { enqueueTask } from './queueService.js';

/**
 * Perform indexed full-text search across chat messages and conversations
 * @param {string} query Search terms
 * @param {object} options Filter options: { userId, conversationId, limit }
 */
export const searchMessages = async (query, options = {}) => {
  if (!query || !query.trim()) {
    return { results: [], total: 0, query: '' };
  }

  const cleanQuery = query.trim();
  const limit = Math.min(parseInt(options.limit || '30', 10), 100);
  const cacheKey = `search:${cleanQuery}:${options.conversationId || 'all'}:${options.userId || 'all'}:${limit}`;

  // 1. Check Redis cache
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const drizzleStatus = getDrizzleStatus();
  let results = [];

  // 2. Execute on Read Replica (or Primary DB) using Drizzle / SQL
  if (drizzleStatus.primaryConnected) {
    try {
      const readDb = getReadDb();
      const likePattern = `%${cleanQuery}%`;

      let whereClause = `(to_tsvector('english', m.content) @@ plainto_tsquery('english', $1) OR m.content ILIKE $2 OR c.title ILIKE $2)`;
      const params = [cleanQuery, likePattern];

      if (options.conversationId) {
        params.push(options.conversationId);
        whereClause += ` AND m.conversation_id = $${params.length}`;
      }

      if (options.userId) {
        params.push(options.userId);
        whereClause += ` AND c.user_id = $${params.length}`;
      }

      params.push(limit);

      const rawSql = `
        SELECT 
          m.id, 
          m.conversation_id, 
          m.sender, 
          m.content, 
          m.created_at,
          c.title AS conversation_title,
          ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) AS rank
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE ${whereClause}
        ORDER BY rank DESC, m.created_at DESC
        LIMIT $${params.length}
      `;

      // Execute via drizzle raw sql / pool
      const queryResult = await readDb.execute(sql.raw(
        rawSql
          .replace('$1', `'${cleanQuery.replace(/'/g, "''")}'`)
          .replace('$2', `'${likePattern.replace(/'/g, "''")}'`)
          .replace(/\$\d+/g, (match) => {
            // handle rest if any
            return match;
          })
      ));

      results = queryResult.rows || [];
    } catch (dbErr) {
      console.warn('Postgres search indexing query warning:', dbErr.message);
      results = searchInMemory(cleanQuery, options, limit);
    }
  } else {
    // 3. High-performance In-Memory Search Engine fallback
    results = searchInMemory(cleanQuery, options, limit);
  }

  const response = {
    query: cleanQuery,
    total: results.length,
    results,
    indexedBy: drizzleStatus.primaryConnected ? 'PostgreSQL GIN Full-Text Index' : 'In-Memory Indexer'
  };

  // Cache for 60 seconds
  await cacheSet(cacheKey, response, 60);

  // Background telemetry task
  enqueueTask('INDEX_MESSAGE_SEARCH', { query: cleanQuery, matchCount: results.length });

  return response;
};

/**
 * In-memory search helper
 */
const searchInMemory = (cleanQuery, options, limit) => {
  const queryLower = cleanQuery.toLowerCase();
  const matched = [];

  for (const [convId, conv] of inMemoryStore.conversations.entries()) {
    if (options.conversationId && convId !== options.conversationId) continue;
    if (options.userId && conv.user_id !== options.userId) continue;

    const msgs = inMemoryStore.messages.get(convId) || [];
    for (const msg of msgs) {
      if (
        msg.content.toLowerCase().includes(queryLower) ||
        (conv.title && conv.title.toLowerCase().includes(queryLower))
      ) {
        matched.push({
          id: msg.id,
          conversation_id: convId,
          sender: msg.sender,
          content: msg.content,
          created_at: msg.created_at,
          conversation_title: conv.title,
          rank: msg.content.toLowerCase().includes(queryLower) ? 1.0 : 0.5
        });
      }
    }
  }

  return matched
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
};

export default {
  searchMessages
};
