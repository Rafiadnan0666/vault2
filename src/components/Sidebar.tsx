'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'; 
import { FiHome, FiUsers, FiMessageSquare, FiBell, FiPlusCircle, FiSearch, FiMenu, FiX, FiChevronDown, FiChevronUp, FiLogOut } from "react-icons/fi";
import { createClient } from '@/utils/supabase/client';
import { IoMdRocket } from "react-icons/io";
import { RiCompassDiscoverLine } from "react-icons/ri";

const Sidebar = () => {
  const router = useRouter();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Fetch teams
        // const { data: teamsData } = await supabase
        //   .from('teams')
        //   .select('*')
        //   .eq('owner_id', user.id);
        
        const { data: memberTeams } = await supabase
          .from('member_team')
          .select('teams(*)')
          .eq('user_id', user.id);
        
        const allTeams = [
          // ...(teamsData || []),
          ...(memberTeams?.map((mt: any) => mt.teams).filter(Boolean) || [])
        ];
        
        setTeams(allTeams);

        // Fetch unread messages (example)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('read', false);
        
        setUnreadCount(count || 0);
      }
    };

    fetchData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div 
              className="flex items-center ml-4 cursor-pointer"
              onClick={() => navigateTo('/')}
            >
              <IoMdRocket className="text-orange-500 text-2xl" />
              <span className="ml-2 font-bold text-lg dark:text-white">Ideas</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <FiBell className="text-gray-700 dark:text-gray-200" />
            </button>
            {user && (
              <div 
                className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium cursor-pointer"
                onClick={() => navigateTo('/profile')}
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div 
            className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={() => navigateTo('/')}
          >
            <IoMdRocket className="text-orange-500 text-2xl" />
            <span className="ml-2 font-bold text-xl dark:text-white">Ideas</span>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSearch} className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Search Reddit"
              />
            </form>
          </div>

          {/* Main navigation */}
          <nav className="flex-1 overflow-y-auto py-2">
            <ul className="space-y-1 px-2">
              <li>
                <button
                  onClick={() => navigateTo('/dashboard')}
                  className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <FiHome className="text-lg" />
                  <span className="ml-3">Home</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/explore')}
                  className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <RiCompassDiscoverLine className="text-lg" />
                  <span className="ml-3">Explore</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsTeamsDropdownOpen(!isTeamsDropdownOpen)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <div className="flex items-center">
                    <FiUsers className="text-lg" />
                    <span className="ml-3">Teams</span>
                  </div>
                  {isTeamsDropdownOpen ? (
                    <FiChevronUp className="text-gray-500" />
                  ) : (
                    <FiChevronDown className="text-gray-500" />
                  )}
                </button>
                {isTeamsDropdownOpen && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {teams.map((team) => (
                      <li key={team.id}>
                        <button
                          onClick={() => navigateTo(`/team/${team.id}`)}
                          className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                        >
                          <span className="truncate">team/{team.name}</span>
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        onClick={() => navigateTo('/team/create')}
                        className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                      >
                        <FiPlusCircle className="mr-2" />
                        Create Team
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/messages')}
                  className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <FiMessageSquare className="text-lg" />
                  <span className="ml-3">Messages</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('/notifications')}
                  className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <FiBell className="text-lg" />
                  <span className="ml-3">Notifications</span>
                </button>
              </li>
            </ul>

            {/* Create post button */}
            <div className="p-3 mt-4">
              <button
                onClick={() => navigateTo('/submit')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-2 px-4 font-medium flex items-center justify-center"
              >
                <FiPlusCircle className="mr-2" />
                Create Post
              </button>
            </div>
          </nav>

          {/* User section */}
          {user && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                <div 
                  className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium"
                  onClick={() => navigateTo('/profile')}
                >
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div 
                  className="ml-3 flex-1 min-w-0"
                  onClick={() => navigateTo('/profile')}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">1 karma</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  title="Sign out"
                >
                  <FiLogOut />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="md:ml-64 pt-16 md:pt-0">
        {/* Your page content goes here */}
      </div>
    </>
  );
};

export default Sidebar;