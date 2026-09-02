import express from 'express';
import multer from 'multer';
import { transcribeAudioWithGroq, generateGroqChat } from '../services/groqService.js';
import {
  ensureConversation,
  saveMessage,
  getConversationContext,
  updateConversationTitle
} from '../services/memoryService.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * POST /api/voice/transcribe
 * Transcribe speech audio file to text
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  // Create temporary file for Groq Whisper API stream
  const tempFilePath = path.join(os.tmpdir(), `voice_${Date.now()}_${req.file.originalname || 'audio.wav'}`);

  try {
    fs.writeFileSync(tempFilePath, req.file.buffer);
    const fileStream = fs.createReadStream(tempFilePath);

    const result = await transcribeAudioWithGroq(fileStream, path.basename(tempFilePath));
    
    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return res.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
    console.error('❌ Transcription route error:', error.message);
    return res.status(500).json({
      error: 'Audio transcription failed',
      details: error.message
    });
  }
});

/**
 * POST /api/voice/chat
 * Complete voiceflow round-trip: (Audio or Text) -> LLM with Memory -> Response
 */
router.post('/chat', upload.single('audio'), async (req, res) => {
  let userText = req.body.text;
  const conversationIdParam = req.body.conversationId;

  let tempFilePath = null;

  try {
    // If audio is provided, transcribe it first
    if (req.file) {
      tempFilePath = path.join(os.tmpdir(), `voice_chat_${Date.now()}_${req.file.originalname || 'audio.wav'}`);
      fs.writeFileSync(tempFilePath, req.file.buffer);
      const fileStream = fs.createReadStream(tempFilePath);

      const transResult = await transcribeAudioWithGroq(fileStream);
      userText = transResult.text;

      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        tempFilePath = null;
      }
    }

    if (!userText || !userText.trim()) {
      return res.status(400).json({ error: 'No speech or text could be detected.' });
    }

    const cleanText = userText.trim();
    const conversationId = await ensureConversation(conversationIdParam, cleanText);
    const conversationHistory = await getConversationContext(conversationId, 20);

    // Save user message
    const userMsg = await saveMessage(conversationId, 'user', cleanText);

    if (conversationHistory.length === 0) {
      await updateConversationTitle(conversationId, cleanText);
    }

    // Call Groq with voice conversational context
    const aiResponse = await generateGroqChat(conversationHistory, cleanText, {
      systemPrompt: 'You are an articulate Voiceflow AI Assistant. Speak clearly and concisely with natural cadence suited for voice listening. You remember the prior turns of this conversation.'
    });

    // Save assistant message
    const aiMsg = await saveMessage(conversationId, 'assistant', aiResponse.text);

    return res.json({
      success: true,
      userText: cleanText,
      responseText: aiResponse.text,
      conversationId,
      model: aiResponse.model,
      durationMs: aiResponse.durationMs || 0,
      userMessage: userMsg,
      assistantMessage: aiMsg
    });
  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
    console.error('❌ Voiceflow chat route error:', error.message);
    return res.status(500).json({
      error: 'Voice conversation processing failed',
      details: error.message
    });
  }
});

export default router;
