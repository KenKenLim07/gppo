import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { ref, onValue } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
import { adminUtils } from '../utils/adminConfig';
import { Capacitor } from '@capacitor/core';

interface UserData {
  uid: string;
  email: string;
  name: string;
  rank: string;
  contact: string;
  station: string;
  badgeNumber: string;
  lat?: number;
  lng?: number;
  lastUpdated?: number;
  isSharingLocation?: boolean;
  status?: string;
  emergencyTriggeredAt?: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalLocations: number;
  systemUptime: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, adminUser, loading, hasPermission } = useAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalLocations: 0,
    systemUptime: 0,
  });
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'tracking'>('all');

  const isNative = Capacitor.isNativePlatform();

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/map');
    }
  }, [isAdmin, loading, navigate]);

  // Fetch users and stats
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      try {
        const usersRef = ref(realtimeDb, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
          if (snapshot.exists()) {
            const usersData: UserData[] = [];
            let activeCount = 0;
            let locationCount = 0;

            snapshot.forEach((childSnapshot) => {
              const userData = childSnapshot.val();
              const user: UserData = {
                uid: childSnapshot.key!,
                email: userData.email || '',
                name: userData.name || 'Unknown',
                rank: userData.rank || '',
                contact: userData.contact || '',
                station: userData.station || '',
                badgeNumber: userData.badgeNumber || '',
                lat: userData.lat,
                lng: userData.lng,
                lastUpdated: userData.lastUpdated,
                isSharingLocation: !!(userData.lat && userData.lng),
                status: userData.status,
                emergencyTriggeredAt: userData.emergencyTriggeredAt,
              };

              usersData.push(user);
              if (user.isSharingLocation) {
                activeCount++;
                locationCount++;
              }
            });

            setUsers(usersData);
            setStats({
              totalUsers: usersData.length,
              activeUsers: activeCount,
              totalLocations: locationCount,
              systemUptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours for demo
            });
          }
          setLoadingData(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleAdminAction = async (action: string, details: any) => {
    if (!adminUser) return;
    
    try {
      await adminUtils.logAdminAction(adminUser.uid, action, details);
      console.log(`Admin action logged: ${action}`);
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const handleViewUserDetails = (user: UserData) => {
    console.log('Opening user details modal for:', user.name);
    setSelectedUser(user);
    setShowUserModal(true);
    handleAdminAction('view_user_details', { userId: user.uid, userName: user.name });
  };

  const closeUserModal = () => {
    console.log('Closing user details modal');
    setShowUserModal(false);
    setSelectedUser(null);
  };

  // Filter users based on active filter
  const getFilteredUsers = () => {
    switch (activeFilter) {
      case 'active':
        return users.filter(user => user.isSharingLocation);
      case 'inactive':
        return users.filter(user => !user.isSharingLocation);
      case 'tracking':
        return users.filter(user => user.isSharingLocation && user.lat && user.lng);
      default:
        return users;
    }
  };

  const filteredUsers = getFilteredUsers();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  // Professional navigation structure with mobile considerations
  const navigationTabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊', 
      permission: 'viewAnalytics'
    },
    { 
      id: 'locations', 
      label: 'Locations', 
      icon: '📍', 
      permission: 'viewAllLocations'
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: '📈', 
      permission: 'generateReports'
    },
    { 
      id: 'logs', 
      label: 'Logs', 
      icon: '📋', 
      permission: 'viewSystemLogs'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: '⚙️', 
      permission: 'manageSystemSettings'
    },
  ];

  // Filter tabs based on permissions only
  const visibleTabs = navigationTabs.filter(tab => hasPermission(tab.permission));

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pt-12 ${isNative ? 'pb-20' : ''}`}>
      {/* Enhanced Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Admin Control Center
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Guimaras Provincial Police
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/map')}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md text-sm font-medium"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-6 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                  selectedTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="py-4">
              {/* Vertical Stack Navigation for Mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex flex-col items-center space-y-1 px-3 py-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="text-center">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Unified Dashboard Tab */}
            {selectedTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Officers</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalUsers}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Registered users</p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Officers</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeUsers}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Currently online</p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Locations</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalLocations}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Being tracked</p>
                      </div>
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">System Uptime</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">24h</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Stable operation</p>
                      </div>
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unified Officer Management Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Officer Management</h3>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{users.length} total</span>
                          <span className="text-green-600 dark:text-green-400">{stats.activeUsers} active</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAllUsers(!showAllUsers);
                          setActiveFilter('all'); // Reset filter when toggling view
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        {showAllUsers ? 'Show Recent' : 'View All'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <button 
                        onClick={() => setActiveFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activeFilter === 'all'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All Officers ({users.length})
                      </button>
                      <button 
                        onClick={() => setActiveFilter('active')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activeFilter === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Active Officers ({stats.activeUsers})
                      </button>
                      <button 
                        onClick={() => setActiveFilter('inactive')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activeFilter === 'inactive'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Inactive Officers ({stats.totalUsers - stats.activeUsers})
                      </button>
                      <button 
                        onClick={() => setActiveFilter('tracking')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activeFilter === 'tracking'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Location Tracking ({stats.totalLocations})
                      </button>
                    </div>

                    {/* Officers List */}
                    <div className="space-y-3">
                      {(showAllUsers ? filteredUsers : filteredUsers.slice(0, 5)).map((user) => (
                        <div key={user.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.rank} • {user.station}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {user.status === 'Emergency' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-ping"></span>
                                🚨 Emergency - Immediate Response Required
                              </span>
                            ) : user.isSharingLocation ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                Inactive
                              </span>
                            )}
                            <button
                              onClick={() => handleViewUserDetails(user)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!showAllUsers && filteredUsers.length > 5 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowAllUsers(true)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View all {filteredUsers.length} officers →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Other Tabs */}
            {selectedTab === 'locations' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Location Management</h3>
                  <p className="text-gray-500 dark:text-gray-400">Advanced location tracking and management features will be implemented here.</p>
                </div>
              </div>
            )}

            {selectedTab === 'reports' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Reports & Analytics</h3>
                  <p className="text-gray-500 dark:text-gray-400">Comprehensive reporting and analytics features will be implemented here.</p>
                </div>
              </div>
            )}

            {selectedTab === 'logs' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">System Logs</h3>
                  <p className="text-gray-500 dark:text-gray-400">System logs and audit trails will be displayed here.</p>
                </div>
              </div>
            )}

            {selectedTab === 'settings' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">System Settings</h3>
                  <p className="text-gray-500 dark:text-gray-400">System configuration and settings will be managed here.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4"
          onClick={closeUserModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Officer Details</h3>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Officer Avatar and Basic Info */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.rank}</p>
                </div>

                {/* Status Badge */}
                <div className="text-center">
                  {selectedUser.status === 'Emergency' ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                      <span className="w-3 h-3 bg-red-400 rounded-full mr-2 animate-ping"></span>
                      🚨 Emergency - Immediate Response Required
                    </span>
                  ) : selectedUser.isSharingLocation ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                      Active - Location Sharing Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                      <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                      Inactive - Location Sharing Disabled
                    </span>
                  )}
                </div>

                {/* Officer Information */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Personal Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Email:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedUser.contact || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Badge Number:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedUser.badgeNumber || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assignment</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Station:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedUser.station}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Rank:</span>
                        <span className="text-gray-900 dark:text-white font-medium">{selectedUser.rank}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  {selectedUser.isSharingLocation && selectedUser.lat && selectedUser.lng && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Current Location</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Latitude:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedUser.lat.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Longitude:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{selectedUser.lng.toFixed(6)}</span>
                        </div>
                        {selectedUser.lastUpdated && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {new Date(selectedUser.lastUpdated).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={closeUserModal}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleAdminAction('export_user_data', { userId: selectedUser.uid });
                      closeUserModal();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 