import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { ref, onValue, set } from 'firebase/database';
import { realtimeDb } from '../services/firebase';
// Removed adminUtils import since audit logging is disabled
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
  isHiddenFromMap?: boolean;
  logoutTime?: number;
  appClosedAt?: number;
  gracePeriodExpired?: boolean;
  clearedByAdmin?: boolean;
  clearedAt?: number;
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
  // Audit log feature removed to save Firebase costs - can be re-enabled later
  // const [showAuditLog, setShowAuditLog] = useState(false);
  // const [auditLogs, setAuditLogs] = useState<Array<{
  //   action: string;
  //   userId: string;
  //   userName: string;
  //   timestamp: number;
  //   reason?: string;
  //   adminUid: string;
  // }>>([]);
  const [showClearInactiveConfirm, setShowClearInactiveConfirm] = useState(false);
  const [clearInactiveLoading, setClearInactiveLoading] = useState(false);
  
  // User Management States
  const [showUserActionsModal, setShowUserActionsModal] = useState(false);
  const [selectedUserForActions, setSelectedUserForActions] = useState<UserData | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  // Helper function to check if user is truly active (within 20 minutes)
  const isUserActive = (userData: any): boolean => {
    // If user has no location data, they're not active
    if (!userData.lat || !userData.lng) return false;
    
    // If user has no lastUpdated time, they're not active
    if (!userData.lastUpdated) return false;
    
    // Check if last update was within 20 minutes
    const timeSinceUpdate = Date.now() - userData.lastUpdated;
    return timeSinceUpdate < 20 * 60 * 1000; // 20 minutes
  };

  // User Management Functions
  const handleUserActions = (user: UserData) => {
    setSelectedUserForActions(user);
    setShowUserActionsModal(true);
  };

  const handlePasswordReset = async (user: UserData) => {
    if (!adminUser) return;
    
    setUserActionLoading(true);
    try {
      // Note: Firebase Admin SDK would be needed for actual password reset
      // For now, we'll show a confirmation and log the action
      console.log(`Password reset requested for user: ${user.email} by admin: ${adminUser.email}`);
      
      // In production, this would call Firebase Admin SDK:
      // await admin.auth().generatePasswordResetLink(user.email)
      
      setShowPasswordResetConfirm(false);
      setShowUserActionsModal(false);
      
      // Show success message (you can add a toast notification here)
      alert(`Password reset email sent to ${user.email}`);
      
    } catch (error) {
      console.error('Password reset failed:', error);
      alert('Password reset failed. Please try again.');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!adminUser) return;
    
    setUserActionLoading(true);
    try {
      // Soft delete first - mark as deleted
      const userRef = ref(realtimeDb, `users/${user.uid}`);
      await set(userRef, {
        ...user,
        deletedAt: Date.now(),
        deletedBy: adminUser.uid,
        status: 'deleted'
      });
      
      console.log(`User ${user.email} soft deleted by admin ${adminUser.email}`);
      
      setShowDeleteConfirm(false);
      setShowUserActionsModal(false);
      
      // Show success message
      alert(`User ${user.email} has been deleted.`);
      
    } catch (error) {
      console.error('User deletion failed:', error);
      alert('User deletion failed. Please try again.');
    } finally {
      setUserActionLoading(false);
    }
  };

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
              const isActive = isUserActive(userData);
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
                isSharingLocation: isActive,
                status: userData.status,
                emergencyTriggeredAt: userData.emergencyTriggeredAt,
                isHiddenFromMap: userData.isHiddenFromMap,
                logoutTime: userData.logoutTime,
                appClosedAt: userData.appClosedAt,
                gracePeriodExpired: userData.gracePeriodExpired,
                clearedByAdmin: userData.clearedByAdmin,
                clearedAt: userData.clearedAt,
              };

              usersData.push(user);
              if (isActive) {
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

  // Listen for auto-unhide events and audit logs
  useEffect(() => {
    if (!isAdmin) return;

    const fetchAuditData = async () => {
      try {
        // Audit log feature removed to save Firebase costs
        // Listen for audit logs
        // const logsRef = ref(realtimeDb, 'auditLogs');
        // const unsubscribeLogs = onValue(logsRef, (snapshot) => {
          
        //   if (snapshot.exists()) {
        //     const logs: Array<{
        //       action: string;
        //       userId: string;
        //       userName: string;
        //       timestamp: number;
        //       reason?: string;
        //       adminUid: string;
        //     }> = [];

        //     snapshot.forEach((childSnapshot) => {
        //       const logData = childSnapshot.val();
        //       logs.push({
        //         action: logData.action,
        //         userId: logData.userId,
        //         userName: logData.userName,
        //         timestamp: logData.timestamp,
        //         reason: logData.reason,
        //         adminUid: logData.adminUid,
        //       });
        //     });

        //     // Sort by timestamp (newest first)
        //     logs.sort((a, b) => b.timestamp - a.timestamp);
        //     setAuditLogs(logs);


        //   }
        // });

        // return () => unsubscribeLogs();
      } catch (error) {
        console.error('Error fetching audit data:', error);
      }
    };

    fetchAuditData();
  }, [isAdmin]);

  const handleAdminAction = async (action: string, details: any) => {
    if (!adminUser) return;
    
    try {
      // Audit logging disabled to save Firebase costs - logging to console only
      // await adminUtils.logAdminAction(adminUser.uid, action, details);
      console.log(`Admin action logged: ${action}`, details);
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

  const handleClearInactiveUsers = async () => {
    setShowClearInactiveConfirm(false);
    setClearInactiveLoading(true);
    try {
      const { ref, update } = await import('firebase/database');
      const inactiveUsers = users.filter(user => {
        if (!user.lastUpdated) return true;
        const timeSinceUpdate = Date.now() - user.lastUpdated;
        return timeSinceUpdate > 20 * 60 * 1000; // 20 minutes
      });
      
      if (inactiveUsers.length === 0) {
        alert('No inactive users to clear');
        setClearInactiveLoading(false);
        return;
      }
      
      for (const user of inactiveUsers) {
        await update(ref(realtimeDb, `users/${user.uid}`), {
          lat: null,
          lng: null,
          isSharingLocation: false,
          lastUpdated: null,
          clearedByAdmin: true,
          clearedAt: Date.now()
        });
      }
      
      handleAdminAction('clear_inactive_users', { 
        count: inactiveUsers.length,
        userIds: inactiveUsers.map(u => u.uid)
      });
      
      alert(`Cleared ${inactiveUsers.length} inactive users`);
      setClearInactiveLoading(false);
    } catch (error) {
      console.error('Error clearing inactive users:', error);
      alert('Error clearing inactive users');
      setClearInactiveLoading(false);
    }
  };

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
      id: 'users', 
      label: 'User Management', 
      icon: '👥', 
      permission: 'viewAllUsers'
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

    // Audit log tab removed to save Firebase costs - can be re-enabled later
    // { 
    //   id: 'audit', 
    //   label: 'Audit Log', 
    //   icon: '🔍', 
    //   permission: 'viewSystemLogs'
    // },
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
                onClick={() => setShowClearInactiveConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium"
                disabled={clearInactiveLoading}
              >
                {clearInactiveLoading ? 'Clearing...' : 'Clear Inactive Users'}
              </button>

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
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {user.rank} • {user.station}
                                {user.isHiddenFromMap && (
                                  <span className="ml-2 text-red-600 dark:text-red-400 font-medium">👁️ Hidden</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {user.status === 'Emergency' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-ping"></span>
                                🚨 Emergency
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
                              onClick={async () => {
                                try {
                                  const { ref, set, get } = await import('firebase/database');
                                  const userRef = ref(realtimeDb, `users/${user.uid}`);
                                  
                                  // Get current user data to preserve other fields
                                  const snapshot = await get(userRef);
                                  const currentData = snapshot.exists() ? snapshot.val() : {};
                                  
                                  // Toggle hidden status
                                  const newHiddenStatus = !user.isHiddenFromMap;
                                  await set(userRef, {
                                    ...currentData,
                                    isHiddenFromMap: newHiddenStatus
                                  });
                                  
                                  // Log the action
                                  handleAdminAction(newHiddenStatus ? 'hide_user' : 'unhide_user', { 
                                    userId: user.uid, 
                                    userName: user.name,
                                    reason: newHiddenStatus ? 'Admin hid user' : 'Admin unhid user'
                                  });
                                } catch (error) {
                                  console.error('Error toggling user visibility:', error);
                                }
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                user.isHiddenFromMap
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {user.isHiddenFromMap ? 'Show' : 'Hide'}
                            </button>
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

            {/* User Management Tab */}
            {selectedTab === 'users' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {users.length} total users
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Officer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Last Active
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.rank} • {user.badgeNumber}
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {user.contact}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isUserActive(user)
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {isUserActive(user) ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.lastUpdated 
                                ? new Date(user.lastUpdated).toLocaleString()
                                : 'Never'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleUserActions(user)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  Actions
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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



            {/* Enhanced Audit Log Tab */}
            {/* {selectedTab === 'audit' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">

                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Log</h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{auditLogs.length} total entries</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAuditLog(!showAuditLog)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      {showAuditLog ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Audit Logs</h3>
                      <p className="text-gray-500 dark:text-gray-400">No audit log entries found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs.slice(0, showAuditLog ? undefined : 10).map((log, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            log.action === 'auto_unhide_user'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : log.action === 'hide_user' || log.action === 'unhide_user'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">
                                  {log.action === 'auto_unhide_user' ? '🟢' :
                                   log.action === 'hide_user' ? '👁️' :
                                   log.action === 'unhide_user' ? '👁️‍🗨️' : 'ℹ️'}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.action === 'auto_unhide_user' ? 'Auto-Unhide User' :
                                   log.action === 'hide_user' ? 'Hide User' :
                                   log.action === 'unhide_user' ? 'Unhide User' :
                                   log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                <div><strong>User:</strong> {log.userName} ({log.userId})</div>
                                {log.reason && <div><strong>Reason:</strong> {log.reason}</div>}
                                <div><strong>Time:</strong> {new Date(log.timestamp).toLocaleString()}</div>
                                <div><strong>Admin:</strong> {log.adminUid === 'system_auto' ? 'System (Auto)' : log.adminUid}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {!showAuditLog && auditLogs.length > 10 && (
                        <div className="text-center mt-4">
                          <button
                            onClick={() => setShowAuditLog(true)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            View all {auditLogs.length} audit entries →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )} */}

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
                      🚨 Emergency
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

      {/* Clear Inactive Users Confirmation Modal */}
      {showClearInactiveConfirm && (
        <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-xs w-full p-4 flex flex-col items-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Clear Inactive Users?</div>
            <div className="text-sm text-gray-700 dark:text-gray-200 mb-4 text-center">This will remove all inactive users (offline for 20+ minutes) from the map. Their location data will be cleared but their profiles will be preserved.</div>
            <div className="flex gap-3 w-full mt-2">
              <button
                className="flex-1 px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
                onClick={() => !clearInactiveLoading && setShowClearInactiveConfirm(false)}
                disabled={clearInactiveLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-3 py-1.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60 text-sm"
                onClick={handleClearInactiveUsers}
                disabled={clearInactiveLoading}
              >
                {clearInactiveLoading ? 'Clearing...' : 'Yes, Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Actions Modal */}
      {showUserActionsModal && selectedUserForActions && (
        <div className="fixed inset-0 z-[10040] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Actions: {selectedUserForActions.name}
              </h3>
              <button
                onClick={() => setShowUserActionsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">User Information</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <div><span className="font-medium">Email:</span> {selectedUserForActions.email}</div>
                  <div><span className="font-medium">Rank:</span> {selectedUserForActions.rank}</div>
                  <div><span className="font-medium">Badge:</span> {selectedUserForActions.badgeNumber}</div>
                  <div><span className="font-medium">Status:</span> 
                    <span className={`ml-1 px-2 py-1 text-xs rounded-full ${
                      isUserActive(selectedUserForActions)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {isUserActive(selectedUserForActions) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPasswordResetConfirm(true)}
                disabled={userActionLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {userActionLoading ? 'Processing...' : 'Reset Password'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={userActionLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {userActionLoading ? 'Processing...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {showPasswordResetConfirm && selectedUserForActions && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Reset Password
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This will send a password reset email to <strong>{selectedUserForActions.email}</strong>
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPasswordResetConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePasswordReset(selectedUserForActions)}
                disabled={userActionLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {userActionLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && selectedUserForActions && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This will permanently delete <strong>{selectedUserForActions.name}</strong>'s account and all associated data.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                ⚠️ This action cannot be undone!
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(selectedUserForActions)}
                disabled={userActionLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {userActionLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 