import React, { useState } from 'react';
import { MessageCircle, X, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { useChat, type Conversation as ChatConversation, type Message as ChatMessage } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useUserStatus } from '../hooks/useUserStatus';
import { UserStatusIndicator } from './UserStatusIndicator';
import { cn } from './ui/utils';

interface ChatButtonProps {
  recipientId?: string;
  recipientName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'floating' | 'inline';
  showUnreadBadge?: boolean;
}

export function ChatButton({
  recipientId,
  recipientName,
  className,
  size = 'md',
  variant = 'floating',
  showUnreadBadge = true
}: ChatButtonProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
  hasChatTables,
  // fields available in ChatContextType
  createConversation,
    setActiveConversation,
    sendMessage,
    markMessagesAsRead,
  // helper methods not present are implemented locally below
  } = useChat();
  const { currentStatus, getUserStatus, isStatusAvailable } = useUserStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Get unread count
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Handle opening chat with specific recipient
  const handleOpenChat = async (targetRecipientId?: string) => {
  if (!hasChatTables) {
      setIsOpen(true);
      return;
    }

    if (targetRecipientId && user) {
      const existing = conversations.find(c => c.participant1_id === targetRecipientId || c.participant2_id === targetRecipientId);
      const conversationId = existing ? existing.id : await createConversation(targetRecipientId);
      if (conversationId) {
        const selected = existing ?? ({ id: conversationId } as any);
        setSelectedConversation(selected);
        setActiveConversation(conversationId);
        await markMessagesAsRead(conversationId);
      }
    }
    setIsOpen(true);
  };

  // Handle conversation selection
  const handleConversationSelect = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setActiveConversation(conversation.id);
    await markMessagesAsRead(conversation.id);
  };

  // Handle sending message
  const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedConversation || !user || !hasChatTables) return;

    const receiverId = selectedConversation.participant1_id === user.id 
      ? selectedConversation.participant2_id 
      : selectedConversation.participant1_id;

  await sendMessage(selectedConversation.id, newMessage);
  setNewMessage('');
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get other participant info
  const getOtherParticipant = (conversation: ChatConversation) => {
    if (!user) return null;
    
    if (conversation.participant1_id === user.id) {
      return {
        id: conversation.participant2_id,
        name: conversation.participant2?.name || 'Usuario',
        avatar: undefined,
        status: 'offline'
      };
    } else {
      return {
        id: conversation.participant1_id,
        name: conversation.participant1?.name || 'Usuario',
        avatar: undefined,
        status: 'offline'
      };
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  if (!user) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14'
  };

  const ChatContent = () => {
    // Show unavailable message if chat system is not available
  if (!hasChatTables) {
      return (
        <div className="p-4">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              El sistema de chat no está disponible actualmente. Las tablas de mensajería necesitan ser configuradas en la base de datos.
            </AlertDescription>
          </Alert>
          
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Funcionalidad de chat temporalmente no disponible</p>
            <p className="text-sm mt-2">Configuración de base de datos requerida</p>
          </div>
        </div>
      );
    }

    if (!selectedConversation) {
      return (
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Conversaciones</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes conversaciones aún</p>
              <p className="text-sm mt-2">Inicia una conversación con un vendedor o cliente</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  if (!otherParticipant) return null;

                  return (
                    <Button
                      key={conversation.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 hover:bg-orange-50"
                      onClick={() => handleConversationSelect(conversation)}
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={otherParticipant.avatar} />
                          <AvatarFallback>
                            {otherParticipant.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isStatusAvailable && (
                          <UserStatusIndicator 
                            status={otherParticipant.status as any} 
                            size="sm"
                            className="absolute -bottom-0.5 -right-0.5"
                          />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{otherParticipant.name}</p>
                            {isStatusAvailable && (
                              <UserStatusIndicator 
                                status={otherParticipant.status as any}
                                showText={false}
                                size="sm"
                              />
                            )}
                          </div>
                          {conversation.last_message_at && (
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(conversation.last_message_at)}
                            </span>
                          )}
                        </div>
            {conversation.last_message?.content && (
                          <p className="text-sm text-gray-600 truncate">
              {conversation.last_message?.content}
                          </p>
                        )}
                      </div>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      );
    }

    const otherParticipant = getOtherParticipant(selectedConversation);
    if (!otherParticipant) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedConversation(null);
                setActiveConversation(null);
              }}
              className="mr-2 p-1"
            >
              ←
            </Button>
            <div className="relative">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={otherParticipant.avatar} />
                <AvatarFallback>
                  {otherParticipant.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isStatusAvailable && (
                <UserStatusIndicator 
                  status={otherParticipant.status as any} 
                  size="sm"
                  className="absolute -bottom-0.5 -right-0.5"
                />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{otherParticipant.name}</p>
              <div className="flex items-center gap-2">
                {isStatusAvailable ? (
                  <UserStatusIndicator 
                    status={otherParticipant.status as any}
                    showText={true}
                    size="sm"
                  />
                ) : (
                  <p className="text-xs text-gray-500">
                    {recipientName && recipientName !== otherParticipant.name 
                      ? recipientName 
                      : 'Usuario'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay mensajes aún</p>
                <p className="text-sm">Envía el primer mensaje</p>
              </div>
            ) : (
              messages.map((message: ChatMessage) => {
                const isOwnMessage = message.sender_id === user.id;
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        isOwnMessage
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isOwnMessage
                            ? 'text-orange-100'
                            : 'text-gray-500'
                        )}
                      >
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1"
              disabled={loading || !hasChatTables}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || loading || !hasChatTables}
              size="sm"
              className="px-3"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Chat Button */}
      <div className="relative">
        <Button
          variant={variant === 'floating' ? 'default' : 'outline'}
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          className={cn(
            variant === 'floating' && 'rounded-full shadow-lg bg-orange-500 hover:bg-orange-600',
            variant === 'floating' && size !== 'sm' && sizeClasses[size],
            !hasChatTables && 'opacity-50',
            className
          )}
          onClick={() => recipientId ? handleOpenChat(recipientId) : handleOpenChat()}
        >
          <MessageCircle className={cn(
            size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
            variant === 'inline' && 'mr-2'
          )} />
          {variant === 'inline' && (
            <span>Chat</span>
          )}
        </Button>

        {/* Unread Badge */}
  {showUnreadBadge && unreadCount > 0 && hasChatTables && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>

      {/* Chat Modal/Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Panel */}
          <Card className={cn(
            'absolute bg-white shadow-xl',
            isMobile 
              ? 'bottom-0 left-0 right-0 rounded-b-none max-h-[80vh]'
              : 'bottom-4 right-4 w-96 h-[500px]',
            'flex flex-col'
          )}>
            <CardHeader className="flex-shrink-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {recipientName ? `Chat con ${recipientName}` : 'Mensajes'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ChatContent />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}