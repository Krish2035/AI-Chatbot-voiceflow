import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { groqKeyPool, ApiKeyPool } from './keyManager.js';

dotenv.config();

// Cache Groq SDK clients by apiKey
const groqClientsCache = new Map();

const getGroqClientForApiKey = (apiKey) => {
  if (!groqClientsCache.has(apiKey)) {
    groqClientsCache.set(apiKey, new Groq({ apiKey }));
  }
  return groqClientsCache.get(apiKey);
};

const SYSTEM_PROMPT = `You are a helpful, intelligent, and articulate Voiceflow AI Assistant.
Key guidelines:
1. You have conversational memory. Reference previous context, user preferences, and prior questions naturally.
2. If the user asks a voice query or voice mode is enabled, keep responses direct, clear, conversational, and easy to understand when read aloud.
3. For technical, coding, or detailed questions, give comprehensive and well-structured answers using clean markdown, lists, and code blocks.
4. Always be friendly, polite, and accurate.`;

/**
 * Generate AI chat response with multi-turn memory and multi-key pooling
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @param {string} userMessage 
 * @param {Object} options 
 */
export const generateGroqChat = async (conversationHistory = [], userMessage, options = {}) => {
  const primaryModel = options.model || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b';

  // Construct message array with system prompt + past memory context + new message
  const messages = [
    { role: 'system', content: options.systemPrompt || SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  if (!groqKeyPool.hasKeys()) {
    // Helpful simulation response if no API keys are configured
    return {
      text: `[Groq API Key Not Configured] Please add your Groq key(s) to GROQ_API_KEYS (or GROQ_API_KEY) in backend/.env to activate live Groq models. (Echoing message: "${userMessage}")`,
      model: 'demo-fallback',
      usage: null
    };
  }

  const tryCallGroq = async (modelToUse) => {
    const startTime = Date.now();
    return await groqKeyPool.executeWithRotation(async (apiKey) => {
      const groq = getGroqClientForApiKey(apiKey);
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: modelToUse,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 1024,
        top_p: 0.9,
        stream: false
      });

      const choice = chatCompletion.choices[0];
      const responseText = choice?.message?.content || 'No response generated.';

      return {
        text: responseText,
        model: chatCompletion.model,
        usage: chatCompletion.usage,
        durationMs: Date.now() - startTime,
        keyUsed: ApiKeyPool.maskKey(apiKey)
      };
    });
  };

  try {
    return await tryCallGroq(primaryModel);
  } catch (error) {
    // If model not found, fallback to available standard models
    if (error.message && error.message.includes('model_not_found')) {
      const fallbacks = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile'];
      for (const fallbackModel of fallbacks) {
        if (fallbackModel !== primaryModel) {
          try {
            console.log(`🔄 Attempting fallback Groq model: ${fallbackModel}...`);
            return await tryCallGroq(fallbackModel);
          } catch (_) {}
        }
      }
    }
    console.error('❌ All Groq API Keys / Models Failed:', error.message);
    throw new Error(`Groq Service Error: ${error.message}`);
  }
};

/**
 * Transcribe speech audio using Groq Whisper API with multi-key pooling
 * @param {File | Blob | Object} fileStream 
 * @param {string} filename 
 */
export const transcribeAudioWithGroq = async (fileStream, filename = 'audio.wav') => {
  if (!groqKeyPool.hasKeys()) {
    throw new Error('No Groq API keys configured in backend/.env (GROQ_API_KEYS)');
  }

  try {
    const result = await groqKeyPool.executeWithRotation(async (apiKey) => {
      const groq = getGroqClientForApiKey(apiKey);
      const transcription = await groq.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-large-v3',
        prompt: 'Clean voice input transcript.',
        response_format: 'verbose_json',
        language: 'en',
        temperature: 0.0
      });

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        keyUsed: ApiKeyPool.maskKey(apiKey)
      };
    });

    return result;
  } catch (error) {
    console.error('❌ Groq Whisper Error:', error.message);
    throw new Error(`Whisper Transcription Error: ${error.message}`);
  }
};

export default {
  generateGroqChat,
  transcribeAudioWithGroq,
  groqKeyPool
};
