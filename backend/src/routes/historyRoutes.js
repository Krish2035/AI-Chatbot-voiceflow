import express from 'express';
import {
  listConversations,
  getFullConversationHistory,
  ensureConversation,
  deleteConversation,
  clearAllConversations
} from '../services/memoryService.js';

const router = express.Router();

/**
 * GET /api/history/conversations
 * Get list of all conversation sessions
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await listConversations();
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
router.post('/conversations', async (req, res) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const newId = await ensureConversation(null, title);
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
 * Clear all conversations
 */
router.delete('/clear', async (req, res) => {
  try {
    await clearAllConversations();
    res.json({ success: true, message: 'All conversations cleared' });
  } catch (error) {
    console.error('❌ Error clearing all conversations:', error.message);
    res.status(500).json({ error: 'Failed to clear conversations', details: error.message });
  }
});

export default router;
