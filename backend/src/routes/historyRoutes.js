import express from 'express';
import {
  listConversations,
  getFullConversationHistory,
  ensureConversation,
  deleteConversation,
  clearAllConversations
} from '../services/memoryService.js';
import { searchMessages } from '../services/searchService.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/history/search
 * Search messages and conversations via indexed full-text search
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, conversationId, limit } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Search query parameter "q" is required.' });
    }

    const userId = req.user?.userId || null;
    const searchData = await searchMessages(q, {
      conversationId,
      userId,
      limit
    });

    return res.json({
      success: true,
      ...searchData
    });
  } catch (error) {
    console.error('❌ Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

/**
 * GET /api/history/conversations
 * Get list of conversation sessions (filtered by user if authenticated)
 */
router.get('/conversations', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const conversations = await listConversations(userId);
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
  }
});

/**
 * GET /api/history/conversations/:id
 * Get full messages history for a conversation
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await getFullConversationHistory(id);
    res.json({ success: true, conversationId: id, messages });
  } catch (error) {
    console.error('❌ Error fetching messages for conversation:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

/**
 * POST /api/history/conversations
 * Create a new conversation session
 */
router.post('/conversations', optionalAuth, async (req, res) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const userId = req.user?.userId || null;
    const newId = await ensureConversation(null, title, userId);
    res.json({ success: true, conversationId: newId, title });
  } catch (error) {
    console.error('❌ Error creating conversation:', error.message);
    res.status(500).json({ error: 'Failed to create conversation', details: error.message });
  }
});

/**
 * DELETE /api/history/conversations/:id
 * Delete a specific conversation session
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteConversation(id);
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('❌ Error deleting conversation:', error.message);
    res.status(500).json({ error: 'Failed to delete conversation', details: error.message });
  }
});

/**
 * DELETE /api/history/clear
 * Clear conversations (clears current user's chats or all if guest)
 */
router.delete('/clear', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    await clearAllConversations(userId);
    res.json({ success: true, message: 'Conversations cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing conversations:', error.message);
    res.status(500).json({ error: 'Failed to clear conversations', details: error.message });
  }
});

export default router;
