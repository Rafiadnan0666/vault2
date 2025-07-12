'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IMessage, INotification, IUser } from '@/types/main.db';
import { FiMessageSquare, FiSearch, FiEdit2, FiTrash2, FiChevronLeft, FiBell } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [conversations, setConversations] = useState<{user: IUser, lastMessage: IMessage}[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newAttachment, setNewAttachment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const refreshInterval = useRef<NodeJS.Timeout>();

  // Optimized fetch functions with caching
  const fetchUser = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push('/sign-in');
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? '',
      name: '',
      password: '',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }, [router, supabase]);

  const fetchConversations = useCallback(async (userId: string) => {
    try {
      // Only fetch messages from the last 30 days to reduce payload
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`from_id.eq.${userId},to_id.eq.${userId}`)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100); // Limit to 100 most recent messages

      if (messagesError) throw messagesError;

      const userIds = new Set<string>();
      messagesData?.forEach(msg => {
        if (msg.from_id !== userId) userIds.add(msg.from_id);
        if (msg.to_id !== userId) userIds.add(msg.to_id);
      });

      if (userIds.size === 0) return [];

      // Cache user profiles in local storage
      const cachedProfiles = localStorage.getItem('userProfiles');
      let profilesData: IUser[] = [];
      
      if (cachedProfiles) {
        const parsed = JSON.parse(cachedProfiles);
        profilesData = Array.from(userIds)
          .map(id => parsed[id])
          .filter(Boolean);
        
        // Check if we have all needed profiles
        if (profilesData.length === userIds.size) {
          // All profiles are cached
        } else {
          // Fetch missing profiles
          const missingIds = Array.from(userIds).filter(id => !parsed[id]);
          const { data: fetchedProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', missingIds);

          if (profilesError) throw profilesError;

          profilesData = [...profilesData, ...(fetchedProfiles || [])];
          
          // Update cache
          const newCache = {...parsed};
          fetchedProfiles?.forEach(profile => {
            newCache[profile.id] = profile;
          });
          localStorage.setItem('userProfiles', JSON.stringify(newCache));
        }
      } else {
        // No cache, fetch all
        const { data: fetchedProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(userIds));

        if (profilesError) throw profilesError;

        profilesData = fetchedProfiles || [];
        
        // Create cache
        const cache = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, IUser>);
        localStorage.setItem('userProfiles', JSON.stringify(cache));
      }

      const convs = Array.from(userIds).map(userId => {
        const user = profilesData.find(u => u.id === userId);
        if (!user) return null;
        
        const lastMessage = messagesData.find(msg => 
          msg.from_id === userId || msg.to_id === userId
        );
        return { user, lastMessage: lastMessage! };
      }).filter(Boolean) as {user: IUser, lastMessage: IMessage}[];

      return convs;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
      return [];
    }
  }, [supabase]);

  const loadMessages = useCallback(async (userId: string, currentUserId: string) => {
    try {
      // Only fetch messages from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(from_id.eq.${currentUserId},to_id.eq.${userId}),and(from_id.eq.${userId},to_id.eq.${currentUserId})`
        )
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
      return [];
    }
  }, [supabase]);

  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20); // Only get the 20 most recent unread notifications

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }, [supabase]);

  const searchUsers = useCallback(async (query: string, currentUserId: string) => {
    if (!query.trim()) {
      return [];
    }

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query);

      // Try exact ID match first
      if (isUUID) {
        const { data: exactIdData, error: exactIdError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', query)
          .neq('id', currentUserId)
          .limit(1);

        if (exactIdError) throw exactIdError;

        if (exactIdData && exactIdData.length > 0) {
          return exactIdData;
        }
      }

      // Fall back to fuzzy search
      const { data: fuzzyData, error: fuzzyError } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (fuzzyError) throw fuzzyError;

      return fuzzyData || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, [supabase]);

  // Optimized refresh function
  const refreshData = useCallback(async () => {
    if (!authUser) return;

    try {
      const [newConvs, newNotifs] = await Promise.all([
        fetchConversations(authUser.id),
        fetchNotifications(authUser.id)
      ]);

      setConversations(prev => {
        // Only update if there are actual changes
        if (JSON.stringify(prev) !== JSON.stringify(newConvs)) {
          return newConvs;
        }
        return prev;
      });

      setNotifications(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newNotifs)) {
          return newNotifs;
        }
        return prev;
      });

      if (selectedUser) {
        const newMessages = await loadMessages(selectedUser.id, authUser.id);
        setMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newMessages)) {
            return newMessages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [authUser, fetchConversations, fetchNotifications, loadMessages, selectedUser]);

  // Setup refresh interval
  useEffect(() => {
    if (authUser) {
      // Initial load
      refreshData();
      
      // Set up interval for refreshing
      refreshInterval.current = setInterval(refreshData, 2500);
      
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
        }
      };
    }
  }, [authUser, refreshData]);

  // Initial auth check
  useEffect(() => {
    const initialize = async () => {
      const user = await fetchUser();
      if (user) {
        setAuthUser(user);
        setLoading(false);
      }
    };

    initialize();
  }, [fetchUser]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim() && authUser) {
        const results = await searchUsers(searchQuery, authUser.id);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, authUser, searchUsers]);

  const createNotification = async (userId: string, type: string, payload: string) => {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          payload,
          read: false
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !authUser) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (editingMessage) {
        const { error } = await supabase
          .from('messages')
          .update({
            content: newMessage,
            attachment: newAttachment,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMessage.id);
        
        if (error) throw error;
        
        setEditingMessage(null);
      } else {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            content: newMessage,
            attachment: newAttachment,
            from_id: authUser.id,
            to_id: selectedUser.id
          })
          .select()
          .single();
        
        if (error) throw error;

        await createNotification(
          selectedUser.id,
          'message',
          `New message from ${authUser.full_name || authUser.email}`
        );
      }
      
      setNewMessage('');
      setNewAttachment('');
      
      // Trigger immediate refresh after sending
      refreshData();
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Trigger immediate refresh after deletion
      refreshData();
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  const startConversation = async (user: IUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    const messages = await loadMessages(user.id, authUser?.id || '');
    setMessages(messages);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-6xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="flex gap-4">
                <div className="w-1/3 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="flex-1 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!authUser) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-100 pt-16">
          <div className="max-w-6xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600">Please sign in to view messages</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 pt-16">
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex h-[calc(100vh-8rem)]">
              {/* Conversations sidebar */}
              <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold flex items-center justify-between">
                    <span>Messages</span>
                    <div className="relative">
                      <FiBell size={20} />
                      {notifications.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                  </h2>
                  <div className="mt-3 relative">
                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, or email..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="border-b border-gray-200">
                    {searchResults.map(user => (
                      <div 
                        key={user.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer flex items-center"
                        onClick={() => startConversation(user)}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mr-3">
                          {(user.full_name || user.email)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-xs text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.map(({user, lastMessage}) => (
                    <div 
                      key={user.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center ${selectedUser?.id === user.id ? 'bg-blue-50' : ''}`}
                      onClick={() => startConversation(user)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mr-3">
                        {(user.full_name || user.email)?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <p className="font-medium truncate">{user.full_name || user.email}</p>
                          {lastMessage && (
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {lastMessage && (
                          <p className="text-sm text-gray-500 truncate">
                            {lastMessage.from_id === authUser.id ? 'You: ' : ''}
                            {lastMessage.content || 'Attachment'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 flex flex-col">
                {selectedUser ? (
                  <>
                    <div className="p-4 border-b border-gray-200 flex items-center">
                      <button 
                        className="md:hidden mr-2 text-gray-500"
                        onClick={() => setSelectedUser(null)}
                      >
                        <FiChevronLeft size={20} />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 mr-3">
                        {(selectedUser.full_name || selectedUser.email)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                        <p className="text-xs text-gray-500">ID: {selectedUser.id}</p>
                      </div>
                    </div>

                    <div 
                      id="messages-container"
                      className="flex-1 overflow-y-auto p-4 space-y-4"
                    >
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        messages.map(message => (
                          <div 
                            key={message.id} 
                            className={`flex ${message.from_id === authUser.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-xs md:max-w-md rounded-lg p-3 ${message.from_id === authUser.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs opacity-80">
                                  {message.from_id === authUser.id ? 'You' : selectedUser.full_name}
                                </span>
                                <span className="text-xs opacity-80">
                                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="whitespace-pre-line">{message.content}</p>
                              {message.attachment && (
                                <div className="mt-2">
                                  <a 
                                    href={message.attachment} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`text-sm ${message.from_id === authUser.id ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                                  >
                                    View attachment
                                  </a>
                                </div>
                              )}
                              {message.from_id === authUser.id && (
                                <div className="flex justify-end gap-2 mt-2">
                                  <button 
                                    onClick={() => {
                                      setEditingMessage(message);
                                      setNewMessage(message.content);
                                      setNewAttachment(message.attachment || '');
                                    }}
                                    className="text-xs p-1 rounded hover:bg-blue-600"
                                  >
                                    <FiEdit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-xs p-1 rounded hover:bg-blue-600"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-200">
                      {editingMessage && (
                        <div className="mb-2 text-sm text-gray-500 flex justify-between items-center">
                          <span>Editing message</span>
                          <button 
                            onClick={() => {
                              setEditingMessage(null);
                              setNewMessage('');
                              setNewAttachment('');
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Attachment URL (optional)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newAttachment}
                          onChange={(e) => setNewAttachment(e.target.value)}
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <textarea
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || isSubmitting}
                          className={`px-4 py-2 rounded-md ${!newMessage.trim() || isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                          {isSubmitting ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-6">
                      <FiMessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-medium text-gray-700 mb-2">Select a conversation</h3>
                      <p className="text-gray-500 mb-4">Choose an existing conversation or search for a user to start a new one</p>
                      <div className="relative max-w-md mx-auto">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by ID, name, or email..."
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}