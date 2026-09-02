const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Send a chat message to backend with conversational memory
 */
export const sendChatMessage = async ({
  message,
  conversationId,
  provider = 'groq',
  model,
  voiceMode = false
}) => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      conversationId,
      provider,
      model,
      voiceMode
    })
  });

  if (!response.ok) {
    let errMsg = `Server responded with ${response.status}`;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errData = await response.json();
        errMsg = errData.details || errData.error || errMsg;
      } else {
        const text = await response.text();
        if (text) errMsg = text.slice(0, 200);
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Check backend health, database status, and API key status
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
};

/**
 * Fetch all conversations from PostgreSQL
 */
export const fetchConversations = async () => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversation history');
  }
  return response.json();
};

/**
 * Fetch full message turns for a conversation from PostgreSQL
 */
export const fetchConversationMessages = async (conversationId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations/${conversationId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversation messages');
  }
  return response.json();
};

/**
 * Create a new conversation session
 */
export const createNewConversation = async (title = 'New Conversation') => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error('Failed to create new conversation');
  }
  return response.json();
};

/**
 * Delete a specific conversation session from PostgreSQL
 */
export const deleteConversationSession = async (conversationId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations/${conversationId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
  return response.json();
};

/**
 * Clear all conversations
 */
export const clearAllChatHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/api/history/clear`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Failed to clear history');
  }
  return response.json();
};

/**
 * Voice roundtrip chat via audio upload
 */
export const sendVoiceChat = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/api/voice/chat`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Voice processing failed');
  }
  return response.json();
};

export default {
  sendChatMessage,
  checkHealth,
  fetchConversations,
  fetchConversationMessages,
  createNewConversation,
  deleteConversationSession,
  clearAllChatHistory,
  sendVoiceChat
};
