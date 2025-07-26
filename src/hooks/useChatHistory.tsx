import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
}

export const useChatHistory = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate unique ID for local use
  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Load chat sessions from database
  const loadChatSessions = async () => {
    if (!profile?.user_id) return;

    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedSessions: ChatSession[] = await Promise.all(
        sessions.map(async (session) => {
          // Load messages for each session
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_session_id', session.id)
            .order('created_at', { ascending: true });

          if (messagesError) throw messagesError;

          const formattedMessages: ChatMessage[] = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            timestamp: new Date(msg.created_at)
          }));

          return {
            id: session.id,
            title: session.title,
            lastMessage: formattedMessages.length > 0 
              ? formattedMessages[formattedMessages.length - 1].content.substring(0, 200) + 
                (formattedMessages[formattedMessages.length - 1].content.length > 200 ? "..." : "")
              : "",
            timestamp: new Date(session.updated_at),
            messages: formattedMessages
          };
        })
      );

      setChatSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new chat session
  const createNewChatSession = async (title: string = 'New Chat') => {
    if (!profile?.user_id) return null;

    try {
      const { data: session, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: profile.user_id,
          title
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: ChatSession = {
        id: session.id,
        title: session.title,
        lastMessage: "",
        timestamp: new Date(session.created_at),
        messages: []
      };

      setChatSessions(prev => [newSession, ...prev]);
      setCurrentChatId(session.id);
      return session.id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
      return null;
    }
  };

  // Save message to database
  const saveMessage = async (chatSessionId: string, content: string, role: 'user' | 'assistant') => {
    if (!profile?.user_id) return null;

    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: chatSessionId,
          user_id: profile.user_id,
          content,
          role
        })
        .select()
        .single();

      if (error) throw error;

      // Update session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatSessionId);

      return message.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // Update chat session title
  const updateChatTitle = async (chatSessionId: string, title: string) => {
    if (!profile?.user_id) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', chatSessionId)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setChatSessions(prev => prev.map(session => 
        session.id === chatSessionId ? { ...session, title } : session
      ));
    } catch (error) {
      console.error('Error updating chat title:', error);
      toast({
        title: "Error",
        description: "Failed to update chat title",
        variant: "destructive"
      });
    }
  };

  // Delete chat session
  const deleteChatSession = async (chatSessionId: string) => {
    if (!profile?.user_id) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', chatSessionId)
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setChatSessions(prev => prev.filter(session => session.id !== chatSessionId));
      
      if (currentChatId === chatSessionId) {
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat session",
        variant: "destructive"
      });
    }
  };

  // Get current chat messages
  const getCurrentChatMessages = (): ChatMessage[] => {
    if (!currentChatId) return [];
    const currentSession = chatSessions.find(session => session.id === currentChatId);
    return currentSession?.messages || [];
  };

  // Get chat history for AI context (formatted for Ollama)
  const getChatHistoryForAI = (chatSessionId: string) => {
    const session = chatSessions.find(s => s.id === chatSessionId);
    if (!session) return [];

    return session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  };

  // Update message content (for streaming)
  const updateMessageContent = (messageId: string, content: string) => {
    setChatSessions(prev => prev.map(session => ({
      ...session,
      messages: session.messages.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      )
    })));
  };

  // Add message to local state only (for real-time updates)
  const addMessageToLocal = (chatSessionId: string, message: ChatMessage) => {
    setChatSessions(prev => prev.map(session => 
      session.id === chatSessionId
        ? {
            ...session,
            messages: [...session.messages, message],
            lastMessage: message.content.substring(0, 200) + (message.content.length > 200 ? "..." : ""),
            timestamp: new Date()
          }
        : session
    ));
  };

  // Load chat sessions on mount
  useEffect(() => {
    if (profile?.user_id) {
      loadChatSessions();
    }
  }, [profile?.user_id]);

  return {
    chatSessions,
    currentChatId,
    loading,
    setCurrentChatId,
    createNewChatSession,
    saveMessage,
    updateChatTitle,
    deleteChatSession,
    getCurrentChatMessages,
    getChatHistoryForAI,
    updateMessageContent,
    addMessageToLocal,
    generateUniqueId,
    loadChatSessions
  };
};