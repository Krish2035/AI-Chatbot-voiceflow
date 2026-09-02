import { query, getDBStatus, inMemoryStore } from '../config/db.js';
import crypto from 'crypto';

/**
 * Generate a unique conversation ID
 */
export const generateId = () => {
  return 'conv_' + crypto.randomBytes(8).toString('hex');
};

/**
 * Ensure a conversation exists, creating it if needed
 */
export const ensureConversation = async (conversationId, initialTitle = 'New Conversation') => {
  const id = conversationId || generateId();
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      const checkRes = await query('SELECT id, title FROM conversations WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        await query(
          'INSERT INTO conversations (id, title, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
          [id, initialTitle.slice(0, 100)]
        );
      }
    } catch (err) {
      console.error('Error ensuring conversation in Postgres:', err.message);
    }
  } else {
    if (!inMemoryStore.conversations.has(id)) {
      inMemoryStore.conversations.set(id, {
        id,
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
 * Update conversation title based on the first prompt
 */
export const updateConversationTitle = async (conversationId, title) => {
  const cleanTitle = (title || 'New Conversation').replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      await query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2',
        [cleanTitle, conversationId]
      );
    } catch (err) {
      console.error('Error updating conversation title in Postgres:', err.message);
    }
  } else {
    const conv = inMemoryStore.conversations.get(conversationId);
    if (conv) {
      conv.title = cleanTitle;
      conv.updated_at = new Date().toISOString();
    }
  }
};

/**
 * Save a message into conversation memory
 */
export const saveMessage = async (conversationId, sender, content) => {
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      const result = await query(
        `INSERT INTO messages (conversation_id, sender, content, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id, conversation_id, sender, content, created_at`,
        [conversationId, sender, content]
      );
      await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
      return result.rows[0];
    } catch (err) {
      console.error('Error saving message in Postgres:', err.message);
    }
  }

  // Fallback to in-memory
  const msgList = inMemoryStore.messages.get(conversationId) || [];
  const newMsg = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    conversation_id: conversationId,
    sender,
    content,
    created_at: new Date().toISOString()
  };
  msgList.push(newMsg);
  inMemoryStore.messages.set(conversationId, msgList);

  const conv = inMemoryStore.conversations.get(conversationId);
  if (conv) {
    conv.updated_at = new Date().toISOString();
  }

  return newMsg;
};

/**
 * Fetch conversational context (formatted for LLM context window)
 * @param {string} conversationId 
 * @param {number} limit Maximum number of past message turns to include
 * @returns {Array<{role: string, content: string}>}
 */
export const getConversationContext = async (conversationId, limit = 20) => {
  if (!conversationId) return [];

  const dbStatus = getDBStatus();
  let messages = [];

  if (dbStatus.connected) {
    try {
      const result = await query(
        `SELECT sender, content, created_at FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, limit]
      );
      // Reverse to chronological order (oldest -> newest)
      messages = result.rows.reverse();
    } catch (err) {
      console.error('Error fetching context from Postgres:', err.message);
      messages = (inMemoryStore.messages.get(conversationId) || []).slice(-limit);
    }
  } else {
    messages = (inMemoryStore.messages.get(conversationId) || []).slice(-limit);
  }

  // Format messages for standard LLM role/content schema
  return messages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content
  }));
};

/**
 * Fetch all messages for a conversation (for frontend UI display)
 */
export const getFullConversationHistory = async (conversationId) => {
  if (!conversationId) return [];

  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      const result = await query(
        `SELECT id, conversation_id, sender, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [conversationId]
      );
      return result.rows;
    } catch (err) {
      console.error('Error getting history from Postgres:', err.message);
    }
  }

  return inMemoryStore.messages.get(conversationId) || [];
};

/**
 * Fetch list of all conversations
 */
export const listConversations = async () => {
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      const result = await query(
        `SELECT c.id, c.title, c.created_at, c.updated_at,
                COUNT(m.id)::int AS message_count,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
         FROM conversations c
         LEFT JOIN messages m ON c.id = m.conversation_id
         GROUP BY c.id
         ORDER BY c.updated_at DESC`
      );
      return result.rows;
    } catch (err) {
      console.error('Error listing conversations from Postgres:', err.message);
    }
  }

  const list = [];
  for (const [id, conv] of inMemoryStore.conversations.entries()) {
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
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      await query('DELETE FROM conversations WHERE id = $1', [conversationId]);
      return true;
    } catch (err) {
      console.error('Error deleting conversation in Postgres:', err.message);
    }
  }

  inMemoryStore.conversations.delete(conversationId);
  inMemoryStore.messages.delete(conversationId);
  return true;
};

/**
 * Clear all conversations
 */
export const clearAllConversations = async () => {
  const dbStatus = getDBStatus();

  if (dbStatus.connected) {
    try {
      await query('DELETE FROM messages');
      await query('DELETE FROM conversations');
      return true;
    } catch (err) {
      console.error('Error clearing conversations in Postgres:', err.message);
    }
  }

  inMemoryStore.conversations.clear();
  inMemoryStore.messages.clear();
  return true;
};
