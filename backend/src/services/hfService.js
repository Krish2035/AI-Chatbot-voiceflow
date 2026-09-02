import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import { hfKeyPool, ApiKeyPool } from './keyManager.js';

dotenv.config();

// Cache Hugging Face inference clients by apiKey
const hfClientsCache = new Map();

const getHfClientForApiKey = (apiKey) => {
  if (!hfClientsCache.has(apiKey)) {
    hfClientsCache.set(apiKey, new HfInference(apiKey));
  }
  return hfClientsCache.get(apiKey);
};

/**
 * Generate chat completion using Hugging Face Inference with multi-key pooling
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @param {string} userMessage 
 * @param {Object} options 
 */
export const generateHfChat = async (conversationHistory = [], userMessage, options = {}) => {
  const model = options.model || 'meta-llama/Llama-3.2-3B-Instruct';

  if (!hfKeyPool.hasKeys()) {
    return {
      text: `[Hugging Face API Key Not Configured] Please add your Hugging Face token(s) to HUGGINGFACE_API_KEYS (or HUGGINGFACE_API_KEY) in backend/.env to use Hugging Face inference. (Echo: "${userMessage}")`,
      model: 'hf-demo-fallback',
      usage: null
    };
  }

  const messages = [
    { role: 'system', content: 'You are a helpful and intelligent AI Voiceflow Assistant with full conversational memory.' },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const startTime = Date.now();

    const result = await hfKeyPool.executeWithRotation(async (apiKey) => {
      const hf = getHfClientForApiKey(apiKey);
      const chatCompletion = await hf.chatCompletion({
        model,
        messages,
        max_tokens: options.max_tokens || 800,
        temperature: options.temperature || 0.7
      });

      const choice = chatCompletion.choices[0];
      return {
        text: choice?.message?.content || 'No response from Hugging Face model.',
        model,
        usage: chatCompletion.usage,
        durationMs: Date.now() - startTime,
        keyUsed: ApiKeyPool.maskKey(apiKey)
      };
    });

    return result;
  } catch (error) {
    console.error('❌ All HuggingFace API Keys Failed:', error.message);
    throw new Error(`HuggingFace Service Error: ${error.message}`);
  }
};

export default {
  generateHfChat,
  hfKeyPool
};
