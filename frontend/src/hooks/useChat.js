import { useState, useEffect, useCallback, useRef } from 'react';
import {
  sendChatMessage,
  fetchConversations,
  fetchConversationMessages,
  createNewConversation,
  deleteConversationSession,
  clearAllChatHistory,
  checkHealth
} from '../services/api.js';

export const useChat = ({ onNewAssistantMessage } = {}) => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversationsList, setConversationsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  // Settings
  const [provider, setProvider] = useState('groq'); // 'groq' | 'huggingface'
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [serverHealth, setServerHealth] = useState(null);

  const onNewAssistantMessageRef = useRef(onNewAssistantMessage);
  onNewAssistantMessageRef.current = onNewAssistantMessage;

  // Load server status & conversations list on startup
  const loadInitialData = useCallback(async () => {
    try {
      setIsInitializing(true);
      const healthData = await checkHealth().catch(err => {
        console.warn('Backend is not yet responding:', err.message);
        return { status: 'offline', services: { database: { connected: false } } };
      });
      setServerHealth(healthData);

      if (healthData.status === 'ok') {
        const convsData = await fetchConversations().catch(() => ({ conversations: [] }));
        setConversationsList(convsData.conversations || []);

        if (convsData.conversations && convsData.conversations.length > 0) {
          // Select most recent conversation
          const latestId = convsData.conversations[0].id;
          setConversationId(latestId);
          const msgsData = await fetchConversationMessages(latestId).catch(() => ({ messages: [] }));
          setMessages(msgsData.messages || []);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh conversations list
  const refreshConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversationsList(data.conversations || []);
    } catch (err) {
      console.warn('Failed to refresh conversation list:', err.message);
    }
  }, []);

  // Switch to a different conversation session (restores memory)
  const selectConversation = useCallback(async (id) => {
    if (id === conversationId) return;
    setError(null);
    setIsLoading(true);
    try {
      setConversationId(id);
      const data = await fetchConversationMessages(id);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to switch conversation:', err);
      setError('Could not load messages for selected conversation.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Start a new conversation
  const startNewChat = useCallback(async () => {
    setError(null);
    try {
      const newConv = await createNewConversation('New Chat');
      setConversationId(newConv.conversationId);
      setMessages([]);
      await refreshConversations();
    } catch (_) {
      // Fallback
      setConversationId(null);
      setMessages([]);
    }
  }, [refreshConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (id) => {
    try {
      await deleteConversationSession(id);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
      await refreshConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [conversationId, refreshConversations]);

  // Clear all conversations
  const clearAllHistory = useCallback(async () => {
    try {
      await clearAllChatHistory();
      setConversationId(null);
      setMessages([]);
      setConversationsList([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  // Send a message (Text or Voice transcript)
  const sendMessage = useCallback(async (text, isVoice = false) => {
    if (!text || !text.trim() || isLoading) return;

    const userMessageContent = text.trim();
    setError(null);

    // Optimistic user message update
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: userMessageContent,
        conversationId,
        provider,
        model: selectedModel,
        voiceMode: isVoice
      });

      // Update active conversation ID if newly created
      if (response.conversationId && response.conversationId !== conversationId) {
        setConversationId(response.conversationId);
      }

      // Append assistant response
      const assistantMsg = {
        id: response.assistantMessage?.id || `ai-${Date.now()}`,
        sender: 'assistant',
        content: response.text,
        model: response.model,
        created_at: response.assistantMessage?.created_at || new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Trigger TTS playback if callback is provided
      if (onNewAssistantMessageRef.current) {
        onNewAssistantMessageRef.current(response.text);
      }

      // Refresh sidebar sessions
      refreshConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to get a response from AI.');
      // Add error message in chat feed
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: `⚠️ **Error:** ${err.message || 'Unable to reach backend. Please check connection and .env keys.'}`,
          created_at: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, provider, selectedModel, isLoading, refreshConversations]);

  return {
    messages,
    conversationId,
    conversationsList,
    isLoading,
    isInitializing,
    error,
    provider,
    setProvider,
    selectedModel,
    setSelectedModel,
    serverHealth,
    sendMessage,
    selectConversation,
    startNewChat,
    deleteConversation,
    clearAllHistory,
    refreshConversations,
    loadInitialData
  };
};

export default useChat;
