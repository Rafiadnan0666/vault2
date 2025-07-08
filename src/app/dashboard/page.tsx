'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IUser, ITeam, IMember_Team, INote, IPost, INotification, IRole, IMessage, ITeam_Message } from '@/types/main.db';
import { FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, FiMessageSquare } from 'react-icons/fi';

export default function Dashboard() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [memberTeams, setMemberTeams] = useState<IMember_Team[]>([]);
  const [notes, setNotes] = useState<INote[]>([]);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeam_Message[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  
  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/sign-in');
        return;
      }

      const authUser: IUser = {
        id: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.name ?? '',
        password: '',
        created_at: new Date(),
        updated_at: new Date(),
      };

      

      setAuthUser(authUser);
      setLoading(false);
    })();
  }, [router, supabase]);

  // Fetch all user-related data
  useEffect(() => {
    if (!authUser) return;

    

    const fetchAllData = async () => {
      try {
        // Fetch teams where user is owner
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .eq('owner_id', authUser.id);
        
        if (!teamsError) setTeams(teamsData || []);

        // Fetch teams where user is member
        const { data: memberTeamsData, error: memberTeamsError } = await supabase
          .from('member_team')
          .select('*')
          .eq('user_id', authUser.id);
        
        if (!memberTeamsError) setMemberTeams(memberTeamsData || []);

        // Fetch user notes
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', authUser.id);
        
        if (!notesError) setNotes(notesData || []);

        // Fetch user posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', authUser.id);
        
        if (!postsError) setPosts(postsData || []);

        // Fetch notifications
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!notificationsError) setNotifications(notificationsData || []);

        // Fetch personal messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`from_id.eq.${authUser.id},to_id.eq.${authUser.id}`)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!messagesError) setMessages(messagesData || []);

        // Fetch team messages from user's teams
        const teamIds = [
          ...(teamsData?.map(t => t.id) || []),
          ...(memberTeamsData?.map(mt => mt.team_id) || [])
        ];

        // Test basic team fetch
          const { data, error } = await supabase
            .from('teams')
            .select('id,name')
            .limit(1);
        
        if (teamIds.length > 0) {
          const { data: teamMessagesData, error: teamMessagesError } = await supabase
            .from('team_messages')
            .select('*')
            .in('team_id', teamIds)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (!teamMessagesError) setTeamMessages(teamMessagesData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, [authUser, supabase]);

// Improved data fetching
const fetchTeamsData = async () => {
  try {
    // Fetch owned teams
    const { data: ownedTeams, error: ownedError } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', authUser.id);

    // Fetch member teams with team details
    const { data: memberTeamsWithDetails, error: memberError } = await supabase
      .from('member_team')
      .select('*, teams(*)')
      .eq('user_id', authUser.id);

    if (ownedError || memberError) {
      throw ownedError || memberError;
    }

    return {
      ownedTeams: ownedTeams || [],
      memberTeams: memberTeamsWithDetails?.map(mt => mt.teams).filter(Boolean) || []
    };
  } catch (error) {
    console.error('Error fetching teams:', error);
    return { ownedTeams: [], memberTeams: [] };
  }
};

// Enhanced team creation
const handleCreateTeam = async () => {
  if (!newTeamName.trim() || !authUser) return;
  
  setCreateTeamError(null);
  
  try {
    // Create team in a transaction
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: newTeamName,
        description: newTeamDescription,
        owner_id: authUser.id
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Add owner as member
    const { error: memberError } = await supabase
      .from('member_team')
      .insert({
        user_id: authUser.id,
        team_id: teamData.id,
        role_id: 1
      });

    if (memberError) throw memberError;

    // Refresh data
    const { ownedTeams, memberTeams } = await fetchTeamsData();
    setTeams(ownedTeams);
    setMemberTeams(memberTeams);

    // Reset form
    setShowCreateModal(false);
    setNewTeamName('');
    setNewTeamDescription('');
    
  } catch (error: any) {
    console.error('Team creation error:', error);
    setCreateTeamError(error.message || 'Failed to create team. Check RLS policies.');
  }
};

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
    </div>
  );


  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {authUser?.name || authUser?.email}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FiUsers size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Teams</p>
                  <p className="text-xl font-semibold">{teams.length + memberTeams.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FiMail size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Messages</p>
                  <p className="text-xl font-semibold">{messages.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FiBell size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Notifications</p>
                  <p className="text-xl font-semibold">{notifications.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <FiMessageSquare size={20} />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Posts</p>
                  <p className="text-xl font-semibold">{posts.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Teams You Own Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Teams You Own</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                  >
                    <FiPlus /> Create Team
                  </button>
                </div>

                {teams.length === 0 ? (
                  <p className="text-gray-500">You havent created any teams yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                      <div key={team.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-lg">{team.name}</h3>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            Owner
                          </span>
                        </div>
                        <p className="text-gray-600 mt-2 text-sm">{team.description}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex items-center text-sm text-gray-500">
                            <FiUsers className="mr-1" /> Members
                          </div>
                          <div className="flex gap-2">
                            <button className="text-gray-500 hover:text-blue-600">
                              <FiEdit2 size={16} />
                            </button>
                            <button className="text-gray-500 hover:text-red-600">
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teams You're Member Of Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Teams Youre Member Of</h2>
                
                {memberTeams.length === 0 ? (
                  <p className="text-gray-500">Youre not a member of any teams yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberTeams.map(memberTeam => (
                      <div key={memberTeam.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-lg">Team ID: {memberTeam.team_id}</h3>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            Member
                          </span>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                          <FiUser className="mr-1" /> Role: {memberTeam.role_id === 1 ? 'Admin' : 'Member'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Recent Notes */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Notes</h2>
                {notes.length === 0 ? (
                  <p className="text-gray-500">No recent notes</p>
                ) : (
                  <div className="space-y-3">
                    {notes.slice(0, 3).map(note => (
                      <div key={note.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm text-gray-600 line-clamp-2">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Notifications</h2>
                {notifications.length === 0 ? (
                  <p className="text-gray-500">No new notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <div key={notification.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium">{notification.type}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{notification.payload}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Messages */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Messages</h2>
                {messages.length === 0 && teamMessages.length === 0 ? (
                  <p className="text-gray-500">No recent messages</p>
                ) : (
                  <div className="space-y-3">
                    {messages.slice(0, 3).map(message => (
                      <div key={message.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium">
                          {message.from_id === Number(authUser?.id) ? 'You' : 'User'} → {message.to_id === Number(authUser?.id) ? 'You' : 'User'}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-1">{message.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {teamMessages.slice(0, 3).map(message => (
                      <div key={message.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="text-sm font-medium">Team Message</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{message.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">Create New Team</h3>
              
              {createTeamError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {createTeamError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="teamDescription"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team description"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateTeamError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className={`px-4 py-2 rounded-md ${newTeamName.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  Create Team
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}