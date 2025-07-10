'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IUser, ITeam, IMember_Team, INote, IPost, INotification, IRole, IMessage, ITeam_Message } from '@/types/main.db';
import { FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, FiMessageSquare } from 'react-icons/fi';

interface MemberWithTeam extends IMember_Team {
  teams: ITeam;
}

export default function Dashboard() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [memberTeams, setMemberTeams] = useState<MemberWithTeam[]>([]);
  const [notes, setNotes] = useState<INote[]>([]);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeam_Message[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<ITeam | null>(null);

  const router = useRouter();
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
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase]);

  const fetchAllData = async () => {
    if (!authUser) return;

    try {
      // Fetch teams where user is owner
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', authUser.id);
      
      setTeams(teamsData || []);

      // Fetch teams where user is member with team details
      const { data: memberTeamsData } = await supabase
        .from('member_team')
        .select('*, teams(*)')
        .eq('user_id', authUser.id);
      
      setMemberTeams(memberTeamsData as MemberWithTeam[] || []);

      // Fetch other data
      const [
        { data: notesData }, 
        { data: postsData },
        { data: notificationsData },
        { data: messagesData }
      ] = await Promise.all([
        supabase.from('notes').select('*').eq('user_id', authUser.id),
        supabase.from('posts').select('*').eq('user_id', authUser.id),
        supabase.from('notifications').select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('messages').select('*')
          .or(`from_id.eq.${authUser.id},to_id.eq.${authUser.id}`)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      setNotes(notesData || []);
      setPosts(postsData || []);
      setNotifications(notificationsData || []);
      setMessages(messagesData || []);

      // Fetch team messages
      const teamIds = [
        ...(teamsData?.map(t => t.id) || []),
        ...(memberTeamsData?.map(mt => mt.team_id) || [])
      ];

      if (teamIds.length > 0) {
        const { data: teamMessagesData } = await supabase
          .from('team_messages')
          .select('*')
          .in('team_id', teamIds)
          .order('created_at', { ascending: false })
          .limit(5);
        
        setTeamMessages(teamMessagesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchAllData();
    }
  }, [authUser]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !authUser) return;
    
    setCreateTeamError(null);
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName,
          description: newTeamDescription,
          owner_id: authUser.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        await supabase.from('member_team').insert({
          user_id: authUser.id,
          team_id: data.id,
          role_id: 1
        });
        
        setShowCreateModal(false);
        setNewTeamName('');
        setNewTeamDescription('');
        fetchAllData();
      }
    } catch (error: any) {
      console.error('Error creating team:', error);
      setCreateTeamError(error.message || 'Failed to create team');
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !newTeamName.trim()) return;
    
    setCreateTeamError(null);
    
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: newTeamName,
          description: newTeamDescription
        })
        .eq('id', editingTeam.id);
      
      if (error) throw error;
      
      setShowCreateModal(false);
      setEditingTeam(null);
      setNewTeamName('');
      setNewTeamDescription('');
      fetchAllData();
    } catch (error: any) {
      console.error('Error updating team:', error);
      setCreateTeamError(error.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!authUser) return;
    
    try {
      await supabase
        .from('member_team')
        .delete()
        .eq('team_id', teamId);
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      fetchAllData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const openEditModal = (team: ITeam) => {
    setEditingTeam(team);
    setNewTeamName(team.name);
    setNewTeamDescription(team.description || '');
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }


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
            {/* Stats cards remain the same */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Teams You Own Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Teams You Own</h2>
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setShowCreateModal(true);
                    }}
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
                          <a 
                            href={`/team/${team.id}`}
                            className="font-medium text-lg hover:underline"
                          >
                            {team.name}
                          </a>
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
                            <button 
                              onClick={() => openEditModal(team)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTeam(team.id)}
                              className="text-gray-500 hover:text-red-600"
                            >
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
                          <a 
                            href={`/team/${memberTeam.team_id}`}
                            className="font-medium text-lg hover:underline"
                          >
                            {memberTeam.teams?.name || `Team ${memberTeam.team_id}`}
                          </a>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            {memberTeam.role_id === 1 ? 'Admin' : 'Member'}
                          </span>
                        </div>
                        {memberTeam.teams?.description && (
                          <p className="text-gray-600 mt-2 text-sm">{memberTeam.teams.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Notes, Notifications, Messages */}
            {/* ... (keep existing code) ... */}
          </div>
        </div>

        {/* Create/Edit Team Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
              
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
                    setEditingTeam(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className={`px-4 py-2 rounded-md ${newTeamName.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}