const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'voiceflow_auth_token';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * ========================================================
 * AUTHENTICATION APIS (JWT + FIREBASE GOOGLE)
 * ========================================================
 */

/**
 * Register with email, password, and name
 */
export const registerWithEmail = async ({ email, password, displayName }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Registration failed');
  }

  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
};

/**
 * Log in with email and password
 */
export const loginWithEmail = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Login failed');
  }

  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
};

/**
 * Exchange Firebase Google credentials with backend for JWT session
 */
export const authWithGoogle = async (googlePayload) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(googlePayload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Google authentication failed');
  }

  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
};

/**
 * Get current authenticated user profile
 */
export const fetchCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    clearAuthToken();
    return null;
  }

  const data = await response.json();
  return data.user || null;
};

/**
 * ========================================================
 * CHAT & VOICE APIS
 * ========================================================
 */

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
    headers: getAuthHeaders(),
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
 * Check backend health, database status, redis, and API key status
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
};

/**
 * ========================================================
 * CONVERSATION HISTORY & SEARCH APIS
 * ========================================================
 */

/**
 * Fetch all conversations from PostgreSQL / Read Replica
 */
export const fetchConversations = async () => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch conversation history');
  }
  return response.json();
};

/**
 * Fetch full message turns for a conversation
 */
export const fetchConversationMessages = async (conversationId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations/${conversationId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch conversation messages');
  }
  return response.json();
};

/**
 * Search history via backend Full-Text Indexing
 */
export const searchHistory = async (query, conversationId = null) => {
  let url = `${API_BASE_URL}/api/history/search?q=${encodeURIComponent(query)}`;
  if (conversationId) {
    url += `&conversationId=${encodeURIComponent(conversationId)}`;
  }
  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return response.json();
};

/**
 * Create a new conversation session
 */
export const createNewConversation = async (title = 'New Conversation') => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error('Failed to create new conversation');
  }
  return response.json();
};

/**
 * Delete a specific conversation session
 */
export const deleteConversationSession = async (conversationId) => {
  const response = await fetch(`${API_BASE_URL}/api/history/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
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
    method: 'DELETE',
    headers: getAuthHeaders()
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
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/voice/chat`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Voice processing failed');
  }
  return response.json();
};

export default {
  registerWithEmail,
  loginWithEmail,
  authWithGoogle,
  fetchCurrentUser,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  sendChatMessage,
  checkHealth,
  fetchConversations,
  fetchConversationMessages,
  searchHistory,
  createNewConversation,
  deleteConversationSession,
  clearAllChatHistory,
  sendVoiceChat
};
