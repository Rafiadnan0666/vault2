'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Layout from "@/components/Layout";
import { ITeam, IPost, IUser, IMember_Team, ITeam_Message, IProfile, IRole } from "@/types/main.db";
import { FiPlus, FiMessageSquare, FiUsers, FiLock, FiGlobe, FiEdit2, FiTrash2, FiX, FiCheck, FiBell } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function TeamPage() {
  const { id: teamId } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [team, setTeam] = useState<ITeam | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<number | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeam_Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'chat'>('posts');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPost, setCurrentPost] = useState<IPost | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postVisibility, setPostVisibility] = useState('public');
  const [postAttachment, setPostAttachment] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newMessageAttachment, setNewMessageAttachment] = useState('');
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout>();
  const initialLoad = useRef(true);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [members, setMembers] = useState<{
    id: number;
    user_id: string;
    team_id: number;
    role_id: number;
    created_at: string;
    profiles: IProfile;
    roles: IRole;
  }[]>([]);

  // Sanitize URL for Next.js Image component
  const sanitizeUrl = (url: string | null) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      // Only allow certain domains for images
      const allowedDomains = [
        'staticflickr.com',
        'yourdomain.com',
        'supabase.co'
      ];
      
      if (!allowedDomains.some(domain => parsed.hostname.includes(domain))) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  };

  // Fetch essential data
  const fetchInitialData = useCallback(async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/sign-in");
        return;
      }

      const authUserData: IUser = {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        name: '',
        password: '',
        created_at: new Date(),
        updated_at: new Date(),
      };
      setAuthUser(authUserData);

      // Fetch team data and membership status in parallel
      const [teamRes, memberRes] = await Promise.all([
        supabase.from("teams").select("*").eq("id", teamId).single(),
        supabase.from("member_team").select("*").eq("user_id", user.id).eq("team_id", teamId).maybeSingle()
      ]);

      if (teamRes.error) {
        throw new Error(teamRes.error.message || "Team not found");
      }

      if (!teamRes.data) {
        throw new Error("Team not found");
      }

      setTeam(teamRes.data);
      setEditName(teamRes.data.name);
      setEditDescription(teamRes.data.description);
      setEditVisibility(teamRes.data.visibility);
      setIsOwner(teamRes.data.owner_id === user.id);

      if (memberRes.data) {
        setIsMember(true);
        setMemberRole(memberRes.data.role_id);
      } else if (teamRes.data.visibility === 'private') {
        // For private teams, show join modal immediately if not member
        setShowJoinModal(true);
      }

      // Load initial posts (only public if not member)
      const postsQuery = supabase
        .from("posts")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (memberRes.data) {
        postsQuery.in("visibility", ["public", "private"]);
      } else {
        postsQuery.eq("visibility", "public");
      }

      const { data: postData, error: postError } = await postsQuery;
      if (postError) throw postError;
      
      // Sanitize post attachments
      const sanitizedPosts = postData?.map(post => ({
        ...post,
        attachment: sanitizeUrl(post.attachment)
      })) || [];
      
      setPosts(sanitizedPosts);

      // Load initial messages if member
      if (memberRes.data) {
        const { data: messageData, error: messageError } = await supabase
          .from("team_messages")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (messageError) throw messageError;
        
        // Sanitize message attachments
        const sanitizedMessages = messageData?.map(message => ({
          ...message,
          attachment: sanitizeUrl(message.attachment)
        })) || [];
        
        setTeamMessages(sanitizedMessages.reverse());
        setHasMoreMessages(messageData?.length === 10);
      }

      // Fetch team members with error handling
      const { data: membersData, error: membersError } = await supabase
        .from("member_team")
        .select("*, profiles:profiles(*), roles:roles(*)")
        .eq("team_id", teamId);

      if (membersError) {
        console.error("Error fetching members:", membersError);
        setMembers([]);
      } else {
        // Sanitize profile avatar URLs
        const sanitizedMembers = membersData?.map(member => ({
          ...member,
          profiles: member.profiles ? {
            ...member.profiles,
            avatar_url: sanitizeUrl(member.profiles.avatar_url)
          } : null
        })) || [];
        
        setMembers(sanitizedMembers);
      }

    } catch (err: any) {
      console.error("Error in fetchInitialData:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [teamId, router, supabase]);

  // Setup refresh interval
  useEffect(() => {
    fetchInitialData();

    refreshInterval.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInitialData();
      }
    }, 2500);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchInitialData]);

  // Infinite scroll for messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !isMember || !hasMoreMessages) return;

    const handleScroll = () => {
      if (container.scrollTop === 0) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMember, hasMoreMessages]);

  const handleSaveSettings = async () => {
    if (!team || !authUser) return;
    const { error } = await supabase.from("teams").update({
      name: editName,
      description: editDescription,
      visibility: editVisibility,
      updated_at: new Date().toISOString(),
    }).eq("id", team.id);

    if (error) {
      setError("Failed to update team");
      return;
    }
    setShowSettingsModal(false);
    fetchInitialData();
  };

  const loadMoreMessages = async () => {
    if (!teamId || !authUser || !hasMoreMessages) return;

    try {
      const nextPage = messagePage + 1;
      const { data: messageData, error } = await supabase
        .from("team_messages")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .range((nextPage - 1) * 10, nextPage * 10 - 1);

      if (error) throw error;

      if (messageData && messageData.length > 0) {
        // Sanitize message attachments
        const sanitizedMessages = messageData.map(message => ({
          ...message,
          attachment: sanitizeUrl(message.attachment)
        }));
        
        setTeamMessages(prev => [...sanitizedMessages.reverse(), ...prev]);
        setMessagePage(nextPage);
        setHasMoreMessages(messageData.length === 10);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error("Error loading more messages:", err);
    }
  };
  
  const handleKick = async (userId: string) => {
    if (!window.confirm("Kick this member?")) return;
    const { error } = await supabase
      .from("member_team")
      .delete()
      .eq("user_id", userId)
      .eq("team_id", teamId);
    if (!error) fetchInitialData();
  };

  const handleJoinTeam = async () => {
    if (!teamId || !authUser) return;
    
    try {
      const { error } = await supabase
        .from('member_team')
        .insert({
          user_id: authUser.id,
          team_id: teamId,
          role_id: 2 // Default member role
        });

      if (error) throw error;

      setIsMember(true);
      setShowJoinModal(false);
      fetchInitialData();

    } catch (err: any) {
      console.error("Error joining team:", err);
      setError(err.message || "Failed to join team");
    }
  };

  const handleLeaveTeam = async () => {
    if (!teamId || !authUser || !window.confirm('Are you sure you want to leave this team?')) return;
    
    try {
      const { error } = await supabase
        .from('member_team')
        .delete()
        .eq('user_id', authUser.id)
        .eq('team_id', teamId);

      if (error) throw error;

      setIsMember(false);
      setMemberRole(null);
      setActiveTab('posts');
      fetchInitialData();
    } catch (err: any) {
      console.error("Error leaving team:", err);
      setError(err.message || "Failed to leave team");
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !teamId || !authUser) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          title: postTitle,
          content: postContent,
          visibility: postVisibility,
          attachment: sanitizeUrl(postAttachment),
          slug: postTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 50),
          team_id: teamId,
          user_id: authUser.id
        });

      if (error) throw error;

      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      setPostVisibility('public');
      setPostAttachment('');
      fetchInitialData();
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
    }
  };

  const handleUpdatePost = async () => {
    if (!currentPost || !postTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: postTitle,
          content: postContent,
          visibility: postVisibility,
          attachment: sanitizeUrl(postAttachment),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPost.id);

      if (error) throw error;

      setShowPostModal(false);
      setCurrentPost(null);
      setPostAttachment('');
      fetchInitialData();
    } catch (err: any) {
      console.error("Error updating post:", err);
      setError(err.message || "Failed to update post");
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      fetchInitialData();
    } catch (err: any) {
      console.error("Error deleting post:", err);
      setError(err.message || "Failed to delete post");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !newMessageAttachment) return;
    if (!teamId || !authUser) return;
    
    try {
      const { error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          from_id: authUser.id,
          content: newMessage,
          attachment: sanitizeUrl(newMessageAttachment)
        });

      if (error) throw error;

      setNewMessage('');
      setNewMessageAttachment('');
      fetchInitialData();

      // Auto-scroll to bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm('Delete this message?')) return;
    
    try {
      const { error } = await supabase
        .from('team_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      fetchInitialData();
    } catch (err: any) {
      console.error("Error deleting message:", err);
      setError(err.message || "Failed to delete message");
    }
  };

  const openPostModal = (post: IPost | null = null) => {
    if (!isMember && team?.visibility === 'private') {
      setShowJoinModal(true);
      return;
    }
    
    setCurrentPost(post);
    setPostTitle(post?.title || '');
    setPostContent(post?.content || '');
    setPostVisibility(post?.visibility || 'public');
    setPostAttachment(post?.attachment || '');
    setShowPostModal(true);
  };

  if (loading && initialLoad.current) return <Layout>Loading...</Layout>;
  if (error) return <Layout>Error: {error}</Layout>;
  if (!team) return <Layout>Team not found</Layout>;

  // For private teams, show join modal if not member
  if (team.visibility === 'private' && !isMember && !isOwner) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pt-16">
          <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <FiLock className="text-3xl text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Private Team</h2>
              <p className="text-gray-600 mb-6">This team is private. You need to join to view its content.</p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2 px-6 rounded-full shadow-md transition-all"
              >
                Join Team
              </button>
            </div>
          </div>
          
          {/* Forced join modal for private teams */}
          {showJoinModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800">Join Team t/{team.name}</h3>
                </div>
                
                <div className="p-6">
                  <p className="text-gray-600 mb-6">
                    This is a private team. You need to join to participate.
                  </p>
                </div>
                
                <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinTeam}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all"
                  >
                    Join Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Team Header */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center mr-4">
                        <FiUsers className="text-2xl text-purple-500" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">t/{team.name}</h1>
                        <p className="text-gray-600">{team.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isMember ? (
                        <>
                          {isOwner && (
                            <button
                              onClick={() => setShowSettingsModal(true)}
                              className="text-sm text-gray-600 hover:text-purple-500 transition-colors"
                            >
                              Team Settings
                            </button>
                          )}
                          <button
                            onClick={handleLeaveTeam}
                            className="text-sm text-red-500 hover:text-red-700 transition-colors"
                          >
                            Leave Team
                          </button>
                        </>
                      ) : (
                        team.visibility === 'public' && (
                          <button
                            onClick={() => setShowJoinModal(true)}
                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-sm font-medium py-2 px-4 rounded-full shadow-sm transition-all"
                          >
                            Join Team
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === 'posts' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <FiEdit2 size={16} />
                      <span>Posts</span>
                    </button>
                    {isMember && (
                      <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === 'chat' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <FiMessageSquare size={16} />
                        <span>Team Chat</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              {activeTab === 'posts' ? (
                <>
                  {/* Create Post Button */}
                  {isMember && (
                    <div className="mb-6">
                      <button
                        onClick={() => openPostModal()}
                        className="flex items-center bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2.5 px-5 rounded-full shadow-md transition-all"
                      >
                        <FiPlus className="mr-2" />
                        Create Post
                      </button>
                    </div>
                  )}

                  {/* Posts List */}
                  <div className="space-y-5">
                    {posts.length > 0 ? (
                      posts.map(post => (
                        <div key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
                          <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div className="flex items-center text-sm text-gray-500">
                                <span className="font-medium text-gray-700">Posted by u/{post.user_id}</span>
                                <span className="mx-2">•</span>
                                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                                {post.visibility === 'private' && (
                                  <span className="ml-2 flex items-center text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                    <FiLock className="mr-1" size={12} /> Team Only
                                  </span>
                                )}
                              </div>
                              {(isOwner || (authUser?.id === post.user_id)) && (
                                <div className="flex gap-3">
                                  <button 
                                    onClick={() => openPostModal(post)}
                                    className="text-gray-500 hover:text-blue-500 transition-colors"
                                    title="Edit"
                                  >
                                    <FiEdit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <FiTrash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <h2 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h2>
                            
                            {post.content && (
                              <div className="prose max-w-none text-gray-700 mb-4 whitespace-pre-line">
                                {post.content}
                              </div>
                            )}

                            {post.attachment && (
                              <div className="mt-4">
                                <a 
                                  href={post.attachment} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-purple-500 hover:text-purple-600 transition-colors"
                                >
                                  <span className="mr-1">View Attachment</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                          <FiEdit2 className="text-2xl text-purple-500" />
                        </div>
                        <p className="text-gray-600">
                          {isMember ? 'No posts yet. Be the first to create one!' : 'No public posts available.'}
                        </p>
                        {isMember && (
                          <button
                            onClick={() => openPostModal()}
                            className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2 px-5 rounded-full shadow-sm transition-all"
                          >
                            Create Post
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Team Chat Tab */
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FiMessageSquare className="text-purple-500" />
                      <span>Team Chat</span>
                    </h2>
                    <div className="text-sm text-gray-500">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  
                  <div 
                    ref={messagesContainerRef}
                    className="p-6 space-y-5 max-h-[60vh] overflow-y-auto"
                  >
                    {hasMoreMessages && (
                      <div className="text-center text-gray-500 text-sm py-2">
                        Scroll up to load older messages...
                      </div>
                    )}
                    
                    {teamMessages.length > 0 ? (
                      teamMessages.map(message => (
                        <div key={message.id} className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600">
                                {message.from_id.toString().charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                u/{message.from_id}
                              </div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </div>
                            </div>
                            <div className="text-gray-700 mt-1 whitespace-pre-line break-words">
                              {message.content}
                            </div>
                            {message.attachment && (
                              <div className="mt-2">
                                <a 
                                  href={message.attachment} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-purple-500 hover:text-purple-600 transition-colors"
                                >
                                  <span className="mr-1">Attachment</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                          {(isOwner || (authUser?.id === message.from_id)) && (
                            <button 
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <FiX size={18} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiMessageSquare className="mx-auto text-3xl text-gray-300 mb-3" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Attachment URL (optional)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={newMessageAttachment}
                        onChange={(e) => setNewMessageAttachment(e.target.value)}
                      />
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() && !newMessageAttachment}
                        className={`px-4 py-2 rounded-r-lg transition-all ${
                          !newMessage.trim() && !newMessageAttachment 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                        }`}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Member List */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden sticky top-6">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FiUsers className="text-purple-500" />
                    <span>Team Members</span>
                    <span className="ml-auto bg-purple-100 text-purple-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {members.length}
                    </span>
                  </h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {members.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                          {member.profiles?.avatar_url ? (
                            <Image
                              src={member.profiles.avatar_url}
                              alt={member.profiles.full_name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover w-10 h-10"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.src = '';
                                target.className = 'rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center w-10 h-10';
                                target.innerHTML = `<span class="text-sm font-medium text-purple-600">${member.profiles?.full_name?.charAt(0) || member.user_id.charAt(0).toUpperCase()}</span>`;
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-600">
                                {member.profiles?.full_name?.charAt(0) || member.user_id.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {member.profiles?.full_name || member.user_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.roles?.name || 'Member'}
                            {member.user_id === team.owner_id && ' • Owner'}
                          </p>
                        </div>
                        {(isOwner && authUser?.id !== member.user_id) && (
                          <button 
                            onClick={() => handleKick(member.user_id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Kick member"
                          >
                            <FiX size={18} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Modal */}
        {showPostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">
                  {currentPost ? 'Edit Post' : 'Create New Post'}
                </h3>
              </div>
              
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Post title"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[150px]"
                    placeholder="Write your post content..."
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attachment URL (optional)</label>
                  <input
                    type="text"
                    value={postAttachment}
                    onChange={(e) => setPostAttachment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://example.com/file.pdf"
                  />
                </div>
                
                {isMember && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="visibility"
                          checked={postVisibility === 'public'}
                          onChange={() => setPostVisibility('public')}
                          className="form-radio h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-gray-700">Public</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="visibility"
                          checked={postVisibility === 'private'}
                          onChange={() => setPostVisibility('private')}
                          className="form-radio h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-gray-700">Team Only</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowPostModal(false);
                    setCurrentPost(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={currentPost ? handleUpdatePost : handleCreatePost}
                  disabled={!postTitle.trim()}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    !postTitle.trim() 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                  }`}
                >
                  {currentPost ? 'Update Post' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Team Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">Join Team t/{team.name}</h3>
                {team.visibility === 'private' && (
                  <p className="text-sm text-purple-500 mt-1 flex items-center gap-1">
                    <FiLock size={14} />
                    <span>This is a private team</span>
                  </p>
                )}
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  {team.description || 'Join this team to participate in discussions.'}
                </p>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                {team.visibility === 'public' && (
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleJoinTeam}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all"
                >
                  Join Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Settings Modal */}
        {showSettingsModal && isOwner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800">Team Settings</h3>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea 
                    value={editDescription} 
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px]"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        checked={editVisibility === 'public'} 
                        onChange={() => setEditVisibility('public')}
                        className="form-radio h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-gray-700">Public</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        checked={editVisibility === 'private'} 
                        onChange={() => setEditVisibility('private')}
                        className="form-radio h-4 w-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-gray-700">Private</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}