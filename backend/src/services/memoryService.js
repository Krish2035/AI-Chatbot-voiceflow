import { getWriteDb, getReadDb, inMemoryStore, getDrizzleStatus, schema } from '../db/drizzle.js';
import { eq, desc, asc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from './redisService.js';
import { enqueueTask } from './queueService.js';

/**
 * Generate a unique conversation ID
 */
export const generateId = () => {
  return 'conv_' + crypto.randomBytes(8).toString('hex');
};

/**
 * Ensure a conversation exists, creating it if needed
 * Optionally associates with an authenticated userId
 */
export const ensureConversation = async (conversationId, initialTitle = 'New Conversation', userId = null) => {
  const id = conversationId || generateId();
  const drizzleStatus = getDrizzleStatus();

  if (drizzleStatus.primaryConnected) {
    try {
      const db = getWriteDb();
      const checkRes = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id));

      if (checkRes.length === 0) {
        await db.insert(schema.conversations).values({
          id,
          userId: userId || null,
          title: initialTitle.slice(0, 100),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (userId && !checkRes[0].userId) {
        // Associate session with user if user just logged in
        await db.update(schema.conversations)
          .set({ userId })
          .where(eq(schema.conversations.id, id));
      }
    } catch (err) {
      console.error('Error ensuring conversation in Postgres/Drizzle:', err.message);
    }
  } else {
    if (!inMemoryStore.conversations.has(id)) {
      inMemoryStore.conversations.set(id, {
        id,
        user_id: userId || null,
        title: initialTitle.slice(0, 100),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      inMemoryStore.messages.set(id, []);
    }
  }

  return id;
};

/**
 * Update conversation title based on first user prompt
 */
export const updateConversationTitle = async (conversationId, title) => {
  const cleanTitle = (title || 'New Conversation').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  const drizzleStatus = getDrizzleStatus();

  if (drizzleStatus.primaryConnected) {
    try {
      const db = getWriteDb();
      await db.update(schema.conversations)
        .set({ title: cleanTitle, updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));
    } catch (err) {
      console.error('Error updating conversation title:', err.message);
    }
  } else {
    const conv = inMemoryStore.conversations.get(conversationId);
    if (conv) {
      conv.title = cleanTitle;
      conv.updated_at = new Date().toISOString();
    }
  }

  // Invalidate Redis conversation caches
  await cacheDelPattern('conv:*');
};

/**
 * Save a message into conversation memory
 */
export const saveMessage = async (conversationId, sender, content) => {
  const drizzleStatus = getDrizzleStatus();
  let savedMsg = null;

  if (drizzleStatus.primaryConnected) {
    try {
      const db = getWriteDb();
      const inserted = await db.insert(schema.messages).values({
        conversationId,
        sender,
        content,
        createdAt: new Date()
      }).returning();

      await db.update(schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId));

      savedMsg = inserted[0];
    } catch (err) {
      console.error('Error saving message via Drizzle:', err.message);
    }
  }

  if (!savedMsg) {
    // In-memory fallback
    const msgList = inMemoryStore.messages.get(conversationId) || [];
    savedMsg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      conversation_id: conversationId,
      sender,
      content,
      created_at: new Date().toISOString()
    };
    msgList.push(savedMsg);
    inMemoryStore.messages.set(conversationId, msgList);

    const conv = inMemoryStore.conversations.get(conversationId);
    if (conv) {
      conv.updated_at = new Date().toISOString();
    }
  }

  // Invalidate cached messages for this conversation
  await cacheDel(`messages:${conversationId}`);
  await cacheDelPattern('conv:*');

  // Enqueue BullMQ background indexing job
  enqueueTask('INDEX_MESSAGE_SEARCH', {
    messageId: savedMsg.id,
    conversationId,
    content: savedMsg.content
  });

  return savedMsg;
};

/**
 * Fetch conversational context (formatted for LLM context window)
 */
export const getConversationContext = async (conversationId, limit = 20) => {
  if (!conversationId) return [];

  const drizzleStatus = getDrizzleStatus();
  let msgs = [];

  if (drizzleStatus.primaryConnected) {
    try {
      const readDb = getReadDb();
      const rows = await readDb.select({
        sender: schema.messages.sender,
        content: schema.messages.content,
        createdAt: schema.messages.createdAt
      })
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

      msgs = rows.reverse();
    } catch (err) {
      console.error('Error fetching context from Read Replica:', err.message);
      msgs = (inMemoryStore.messages.get(conversationId) || []).slice(-limit);
    }
  } else {
    msgs = (inMemoryStore.messages.get(conversationId) || []).slice(-limit);
  }

  return msgs.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content
  }));
};

/**
 * Fetch full messages for a conversation (for frontend UI display)
 * Uses Redis cache and Read Replica
 */
export const getFullConversationHistory = async (conversationId) => {
  if (!conversationId) return [];

  const cacheKey = `messages:${conversationId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const drizzleStatus = getDrizzleStatus();
  let result = [];

  if (drizzleStatus.primaryConnected) {
    try {
      const readDb = getReadDb();
      const rows = await readDb.select({
        id: schema.messages.id,
        conversation_id: schema.messages.conversationId,
        sender: schema.messages.sender,
        content: schema.messages.content,
        created_at: schema.messages.createdAt
      })
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(asc(schema.messages.createdAt));

      result = rows;
    } catch (err) {
      console.error('Error getting history from Read Replica:', err.message);
      result = inMemoryStore.messages.get(conversationId) || [];
    }
  } else {
    result = inMemoryStore.messages.get(conversationId) || [];
  }

  // Cache for 60 seconds
  await cacheSet(cacheKey, result, 60);
  return result;
};

/**
 * Fetch list of conversations (optionally filtered by userId)
 * Uses Read Replica and Redis cache
 */
export const listConversations = async (userId = null) => {
  const cacheKey = `conv:list:${userId || 'guest'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const drizzleStatus = getDrizzleStatus();
  let list = [];

  if (drizzleStatus.primaryConnected) {
    try {
      const readDb = getReadDb();
      const whereCondition = userId ? `WHERE c.user_id = ${parseInt(userId, 10)}` : '';

      const querySql = `
        SELECT c.id, c.title, c.user_id, c.created_at, c.updated_at,
               COUNT(m.id)::int AS message_count,
               (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        ${whereCondition}
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `;

      const result = await readDb.execute(sql.raw(querySql));
      list = result.rows || [];
    } catch (err) {
      console.error('Error listing conversations from Read Replica:', err.message);
      list = listInMemory(userId);
    }
  } else {
    list = listInMemory(userId);
  }

  await cacheSet(cacheKey, list, 30);
  return list;
};

const listInMemory = (userId) => {
  const list = [];
  for (const [id, conv] of inMemoryStore.conversations.entries()) {
    if (userId && conv.user_id && conv.user_id !== userId) continue;
    const msgs = inMemoryStore.messages.get(id) || [];
    list.push({
      ...conv,
      message_count: msgs.length,
      last_message: msgs.length > 0 ? msgs[msgs.length - 1].content : null
    });
  }
  return list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
};

/**
 * Delete a conversation and its messages
 */
export const deleteConversation = async (conversationId) => {
  const drizzleStatus = getDrizzleStatus();

  if (drizzleStatus.primaryConnected) {
    try {
      const db = getWriteDb();
      await db.delete(schema.conversations).where(eq(schema.conversations.id, conversationId));
    } catch (err) {
      console.error('Error deleting conversation via Drizzle:', err.message);
    }
  }

  inMemoryStore.conversations.delete(conversationId);
  inMemoryStore.messages.delete(conversationId);

  await cacheDel(`messages:${conversationId}`);
  await cacheDelPattern('conv:*');
  return true;
};

/**
 * Clear all conversations
 */
export const clearAllConversations = async (userId = null) => {
  const drizzleStatus = getDrizzleStatus();

  if (drizzleStatus.primaryConnected) {
    try {
      const db = getWriteDb();
      if (userId) {
        await db.delete(schema.conversations).where(eq(schema.conversations.userId, userId));
      } else {
        await db.delete(schema.messages);
        await db.delete(schema.conversations);
      }
    } catch (err) {
      console.error('Error clearing conversations:', err.message);
    }
  }

  if (userId) {
    for (const [id, conv] of inMemoryStore.conversations.entries()) {
      if (conv.user_id === userId) {
        inMemoryStore.conversations.delete(id);
        inMemoryStore.messages.delete(id);
      }
    }
  } else {
    inMemoryStore.conversations.clear();
    inMemoryStore.messages.clear();
  }

  await cacheDelPattern('messages:*');
  await cacheDelPattern('conv:*');
  return true;
};

export default {
  generateId,
  ensureConversation,
  updateConversationTitle,
  saveMessage,
  getConversationContext,
  getFullConversationHistory,
  listConversations,
  deleteConversation,
  clearAllConversations
};
