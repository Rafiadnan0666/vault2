'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IPost, INote, IUser } from '@/types/main.db';
import { FiArrowUp, FiArrowDown, FiMessageSquare, FiShare2, FiBookmark, FiMoreHorizontal, FiEdit2, FiTrash2, FiCornerUpLeft } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function PostPage() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<IPost | null>(null);
  const [notes, setNotes] = useState<INote[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<INote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteAttachment, setNoteAttachment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/sign-in');
        return;
      }
      setAuthUser({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        name: '',
        password: '',
        created_at: new Date(),
        updated_at: new Date(),
      });
    };

    fetchUser();
  }, [router, supabase]);

  const fetchPostAndNotes = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the post by slug
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (postError || !postData) {
        throw new Error('Post not found');
      }

      setPost(postData);

      // Fetch all notes for this post with public visibility
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('post_id', postData.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: true });

      if (notesError) throw notesError;

      setNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [slug, supabase]);

  useEffect(() => {
    if (slug) {
      fetchPostAndNotes();
    }
  }, [slug, fetchPostAndNotes]);

  const getAttachmentType = (url: string) => {
    if (!url) return null;
    
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|mov|avi)$/i.test(url)) return 'video';
    if (/\.(mp3|wav|ogg)$/i.test(url)) return 'audio';
    if (/^https?:\/\//i.test(url)) return 'web';
    
    return null;
  };

  const renderAttachmentPreview = (url: string) => {
    const type = getAttachmentType(url);
    
    if (!type) return null;
    
    switch (type) {
      case 'image':
        return (
          <div className="mt-3">
            <img 
              src={url} 
              alt="Attachment" 
              className="max-h-96 w-full object-contain rounded-lg bg-gray-100"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        );
      case 'video':
        return (
          <div className="mt-3">
            <video 
              controls 
              className="max-h-96 w-full rounded-lg bg-black"
            >
              <source src={url} type={`video/${url.split('.').pop()}`} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-3">
            <audio 
              controls 
              className="w-full"
            >
              <source src={url} type={`audio/${url.split('.').pop()}`} />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      case 'web':
        return (
          <div className="mt-3 border rounded-lg overflow-hidden">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:bg-gray-50 p-3"
            >
              <div className="flex items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate">{new URL(url).hostname}</p>
                  <h4 className="text-sm font-medium text-gray-900 truncate">{url}</h4>
                </div>
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <div className="ml-3 flex-shrink-0">
                    <img 
                      src={url} 
                      alt="Link preview" 
                      className="h-16 w-16 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  const openNoteModal = (note: INote | null, isReply = false) => {
    setCurrentNote(note);
    setNoteContent(note?.content || '');
    setNoteAttachment(note?.attachment || '');
    setReplyingTo(isReply && note ? note.id : null);
    setShowNoteModal(true);
  };

  const handleNoteSubmit = async () => {
    if (!noteContent.trim() || !post || !authUser) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (currentNote && !replyingTo) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            content: noteContent,
            attachment: noteAttachment,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentNote.id);
        
        if (error) throw error;
        
        setNotes(prev => prev.map(n => 
          n.id === currentNote.id ? 
          { ...n, content: noteContent, attachment: noteAttachment, updated_at: new Date() } : 
          n
        ));
      } else {
        // Create new note or reply
        const { data, error } = await supabase
          .from('notes')
          .insert({
            content: noteContent,
            attachment: noteAttachment,
            post_id: post.id,
            user_id: authUser.id, // now using string directly
            visibility: 'public',
            parent_id: replyingTo || null
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setNotes(prev => [...prev, {
          ...data,
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }
      
      setShowNoteModal(false);
      setCurrentNote(null);
      setReplyingTo(null);
    } catch (error: any) {
      console.error('Error saving note:', error);
      setError(error.message || 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!window.confirm('Are you sure you want to delete this note and all its replies?')) return;
    
    try {
      // First delete all replies
      await supabase
        .from('notes')
        .delete()
        .eq('parent_id', noteId);
      
      // Then delete the note itself
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
      
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  const renderNote = (note: INote, depth = 0) => {
    const isOwner = authUser && note.user_id === authUser.id;
    const replies = notes.filter(n => n.parent_id === note.id);
    const maxDepth = 6;
    const borderColors = [
      'border-gray-200',
      'border-blue-200',
      'border-green-200',
      'border-yellow-200',
      'border-purple-200',
      'border-pink-200',
      'border-red-200'
    ];
    const currentBorder = depth < maxDepth ? borderColors[depth] : borderColors[maxDepth];
    
    return (
      <div key={note.id} className={`border-l-2 ${currentBorder} pl-4 mb-4`}>
        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">u/{note.user_id}</span>
              <span className="mx-1">•</span>
              <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
              {note.updated_at > note.created_at && (
                <span className="text-xs italic ml-1">(edited)</span>
              )}
            </div>
            
            <div className="flex gap-2">
              {authUser && (
                <button 
                  onClick={() => openNoteModal(note, true)}
                  className="text-gray-500 hover:text-blue-600 text-sm"
                  title="Reply"
                >
                  <FiCornerUpLeft size={16} />
                </button>
              )}
              {isOwner && (
                <>
                  <button 
                    onClick={() => openNoteModal(note)}
                    className="text-gray-500 hover:text-blue-600 text-sm"
                    title="Edit"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-gray-500 hover:text-red-600 text-sm"
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="text-gray-800 whitespace-pre-line">
            {note.content}
          </div>
          
          {note.attachment && renderAttachmentPreview(note.attachment)}
          
          {/* Render replies if we haven't reached max depth */}
          {depth < maxDepth && replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {replies.map(reply => renderNote(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-16">
          <div className="max-w-4xl mx-auto p-4">
            <div className="animate-pulse space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="ml-4 border-l-2 border-gray-200 pl-4 mb-6">
                    <div className="h-24 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pt-16">
          <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Post Not Found</h2>
              <p className="text-gray-600 mb-4">{error || 'The post you are looking for does not exist.'}</p>
              <Link href="/" className="text-blue-600 hover:underline">
                Go back to home
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Main Post */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <Link href={`/profiles/${post.user_id}`}> <span className="font-medium text-gray-800">Posted by u/{post.user_id}</span></Link>
                <span className="mx-1">•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
              
              {post.content && (
                <div className="prose max-w-none text-gray-800 mb-4 whitespace-pre-line">
                  {post.content}
                </div>
              )}
              
              {post.attachment && renderAttachmentPreview(post.attachment)}
              
              <div className="flex items-center mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <button className="flex items-center mr-6 hover:text-gray-700">
                  <FiArrowUp className="mr-1" />
                  <span>Upvote</span>
                </button>
                <button className="flex items-center mr-6 hover:text-gray-700">
                  <FiArrowDown className="mr-1" />
                  <span>Downvote</span>
                </button>
                <button 
                  className="flex items-center hover:text-gray-700"
                  onClick={() => openNoteModal(null)}
                >
                  <FiMessageSquare className="mr-1" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center ml-auto hover:text-gray-700">
                  <FiShare2 className="mr-1" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Notes/Comments Section */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {notes.filter(n => !n.parent_id).length} {notes.filter(n => !n.parent_id).length === 1 ? 'Comment' : 'Comments'}
              </h2>
            </div>
            
            <div className="p-6">
              {/* Add comment button */}
              <button 
                onClick={() => openNoteModal(null)}
                className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-500 mb-6 transition-colors"
              >
                What are your thoughts?
              </button>
              
              {/* Comments list */}
              <div className="space-y-6">
                {notes.filter(note => !note.parent_id).map(note => renderNote(note))}
              </div>
              
              {notes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No comments yet. Be the first to share what you think!
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium">
                  {currentNote ? 
                    (replyingTo ? 'Reply to Comment' : 'Edit Comment') : 
                    'Add Comment'}
                </h3>
                {replyingTo && (
                  <p className="text-sm text-gray-500 mt-1">
                    Replying to comment by u{
                      notes.find(n => n.id === replyingTo)?.user_id || ''
                    }
                  </p>
                )}
              </div>
              
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                
                <textarea
                  placeholder={replyingTo ? "Write your reply..." : "What are your thoughts?"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Attachment URL (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={noteAttachment}
                    onChange={(e) => setNoteAttachment(e.target.value)}
                  />
                  {noteAttachment && (
                    <div className="mt-2 text-xs text-gray-500">
                      {getAttachmentType(noteAttachment) === 'image' && 'Image detected'}
                      {getAttachmentType(noteAttachment) === 'video' && 'Video detected'}
                      {getAttachmentType(noteAttachment) === 'audio' && 'Audio detected'}
                      {getAttachmentType(noteAttachment) === 'web' && 'Link detected'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setCurrentNote(null);
                    setReplyingTo(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleNoteSubmit}
                  disabled={!noteContent.trim() || isSubmitting}
                  className={`px-4 py-2 rounded-lg ${!noteContent.trim() || isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  {isSubmitting ? 'Submitting...' : 
                   currentNote ? 
                     (replyingTo ? 'Reply' : 'Update') : 
                     'Comment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}