import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  read_by: Record<string, boolean>;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_id?: string;
  last_message_at: string;
  created_at: string;
  participant1?: {
    id: string;
    name: string;
    role: string;
  };
  participant2?: {
    id: string;
    name: string;
    role: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count: number;
}

interface ChatContextType {
  conversations: Conversation[];
  messages: Message[];
  activeConversation: string | null;
  loading: boolean;
  error: string | null;
  hasChatTables: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (otherUserId: string) => Promise<string | null>;
  setActiveConversation: (conversationId: string | null) => void;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  checkChatTables: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChatTables, setHasChatTables] = useState(false);

  // Check if chat tables exist and are properly configured
  const checkChatTables = async () => {
    try {
      setError(null);
      
      // Test conversations table
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      // Test messages table
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .limit(1);

      // Test users table (for chat relationships)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .limit(1);

      // Check for specific errors
      const hasErrors = conversationsError || messagesError || usersError;
      
      if (hasErrors) {
        console.log('Chat tables check errors:', {
          conversationsError,
          messagesError,
          usersError: usersError ? { message: usersError.message } : null
        });
        
        // Set specific error messages based on the type of error
        if (conversationsError?.code === '42P01' || messagesError?.code === '42P01') {
          setError('Las tablas de chat no están configuradas. Ejecuta el script de configuración.');
        } else if (usersError) {
          setError('Error en tabla de usuarios para chat.');
        } else {
          setError('Error de configuración en sistema de chat.');
        }
        
        setHasChatTables(false);
      } else {
        setHasChatTables(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error checking chat tables:', error);
      setError('No se pudieron verificar las tablas de chat.');
      setHasChatTables(false);
    }
  };

  useEffect(() => {
    checkChatTables();
  }, []);

  const loadConversations = async () => {
    if (!user || !hasChatTables) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!participant1_id (id, name, role),
          participant2:users!participant2_id (id, name, role),
          messages!last_message_id (content, created_at)
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Calculate unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .not('read_by', 'cs', `{"${user.id}": true}`);

          return {
            ...conv,
            last_message: conv.messages,
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      setError('Error al cargar conversaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!user || !hasChatTables) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id (id, name, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError('Error al cargar mensajes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !hasChatTables) return;

    try {
      setError(null);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          read_by: { [user.id]: true }
        })
        .select(`
          *,
          sender:users!sender_id (id, name, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add message to local state
      setMessages(prev => [...prev, data]);

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message_id: data.id,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Refresh conversations to update last message
      loadConversations();

    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('Error al enviar mensaje: ' + error.message);
      toast.error('Error al enviar mensaje');
    }
  };

  const createConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user || !hasChatTables) return null;

    try {
      setError(null);

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
        .single();

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: otherUserId,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Refresh conversations
      loadConversations();

      return data.id;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      setError('Error al crear conversación: ' + error.message);
      toast.error('Error al crear conversación');
      return null;
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user || !hasChatTables) return;

    try {
      setError(null);

      // Update all unread messages in this conversation
      const { error } = await supabase
        .from('messages')
        .update({
          read_by: { [user.id]: true }
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .not('read_by', 'cs', `{"${user.id}": true}`);

      if (error) {
        throw error;
      }

      // Refresh conversations to update unread count
      loadConversations();
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      setError('Error al marcar mensajes como leídos: ' + error.message);
    }
  };

  // Auto-load conversations when user is available and chat tables exist
  useEffect(() => {
    if (user && hasChatTables) {
      loadConversations();
    }
  }, [user, hasChatTables]);

  // Real-time subscriptions for messages
  useEffect(() => {
    if (!user || !hasChatTables || !activeConversation) return;

    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`
        },
        (payload) => {
          console.log('New message received:', payload);
          loadMessages(activeConversation);
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [user, hasChatTables, activeConversation]);

  const value: ChatContextType = {
    conversations,
    messages,
    activeConversation,
    loading,
    error,
    hasChatTables,
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    setActiveConversation,
    markMessagesAsRead,
    checkChatTables
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}