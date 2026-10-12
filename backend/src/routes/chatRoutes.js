import express from 'express';
import { generateGroqChat } from '../services/groqService.js';
import { generateHfChat } from '../services/hfService.js';
import {
  ensureConversation,
  updateConversationTitle,
  saveMessage,
  getConversationContext
} from '../services/memoryService.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/chat
 * Main AI Chat endpoint with Drizzle ORM, conversational memory, rate limiting, and optional JWT auth
 */
router.post('/', chatLimiter, optionalAuth, async (req, res) => {
  const {
    message,
    conversationId: clientConversationId,
    provider = 'groq',
    model,
    voiceMode = false
  } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const cleanMessage = message.trim();
  const userId = req.user?.userId || null;

  try {
    // 1. Ensure conversation session exists (bound to user if logged in)
    const conversationId = await ensureConversation(clientConversationId, cleanMessage, userId);

    // 2. Fetch past conversational memory context from Read Replica
    const conversationHistory = await getConversationContext(conversationId, 20);

    // 3. Save User message to persistent storage & enqueue BullMQ indexing
    const userMsgRecord = await saveMessage(conversationId, 'user', cleanMessage);

    // If this is the start of the chat, update conversation title
    if (conversationHistory.length === 0) {
      await updateConversationTitle(conversationId, cleanMessage);
    }

    // 4. Generate AI response with conversational memory
    let aiResponse;
    if (provider === 'huggingface') {
      aiResponse = await generateHfChat(conversationHistory, cleanMessage, { model });
    } else {
      aiResponse = await generateGroqChat(conversationHistory, cleanMessage, {
        model,
        systemPrompt: voiceMode 
          ? `You are an AI Voiceflow assistant. Keep responses natural, conversational, and direct so they are clear when spoken aloud. You have full conversational memory of prior messages in this conversation.`
          : undefined
      });
    }

    // 5. Save AI response to persistent storage & enqueue BullMQ indexing
    const aiMsgRecord = await saveMessage(conversationId, 'assistant', aiResponse.text);

    // 6. Return response to client
    return res.json({
      success: true,
      conversationId,
      text: aiResponse.text,
      model: aiResponse.model,
      provider,
      durationMs: aiResponse.durationMs || 0,
      userMessage: userMsgRecord,
      assistantMessage: aiMsgRecord
    });
  } catch (error) {
    console.error('❌ Error processing chat:', error.message);
    return res.status(500).json({
      error: 'Failed to generate chat response',
      details: error.message
    });
  }
});

export default router;
