// Admin Configuration for Police Tracking System
// Single Super Admin with Full System Control

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'super_admin';
  permissions: AdminPermissions;
  createdAt: number;
  lastLogin: number;
}

export interface AdminPermissions {
  // User Management
  viewAllUsers: boolean;
  createUsers: boolean;
  editUsers: boolean;
  deleteUsers: boolean;
  resetUserPasswords: boolean;
  manageUserVisibility: boolean;
  
  // Location & Tracking
  viewAllLocations: boolean;
  exportLocationData: boolean;
  deleteLocationHistory: boolean;
  forceLocationUpdate: boolean;
  
  // System Management
  viewSystemLogs: boolean;
  manageSystemSettings: boolean;
  backupData: boolean;
  restoreData: boolean;
  
  // Analytics & Reports
  viewAnalytics: boolean;
  generateReports: boolean;
  exportReports: boolean;
  
  // Security
  viewSecurityLogs: boolean;
  manageSecuritySettings: boolean;
  blockUsers: boolean;
  unblockUsers: boolean;
}

// Super Admin Configuration
export const SUPER_ADMIN_EMAIL = 'gppoguimaras@gmail.com'; // Change this to actual admin email

// Full permissions for super admin
export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  // User Management - Full Control
  viewAllUsers: true,
  createUsers: true,
  editUsers: true,
  deleteUsers: true,
  resetUserPasswords: true,
  manageUserVisibility: true,
  
  // Location & Tracking - Full Control
  viewAllLocations: true,
  exportLocationData: true,
  deleteLocationHistory: true,
  forceLocationUpdate: true,
  
  // System Management - Full Control
  viewSystemLogs: true,
  manageSystemSettings: true,
  backupData: true,
  restoreData: true,
  
  // Analytics & Reports - Full Control
  viewAnalytics: true,
  generateReports: true,
  exportReports: true,
  
  // Security - Full Control
  viewSecurityLogs: true,
  manageSecuritySettings: true,
  blockUsers: true,
  unblockUsers: true,
};

// Admin utility functions
export const adminUtils = {
  // Check if user is super admin
  isSuperAdmin: (email: string): boolean => {
    return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  },
  
  // Check if user has specific permission
  hasPermission: (user: AdminUser | null, permission: keyof AdminPermissions): boolean => {
    if (!user || user.role !== 'super_admin') return false;
    return user.permissions[permission] || false;
  },
  
  // Get admin user from Firebase
  getAdminUser: async (uid: string): Promise<AdminUser | null> => {
    try {
      const { ref, get } = await import('firebase/database');
      const { realtimeDb } = await import('../services/firebase');
      
      const adminRef = ref(realtimeDb, `admins/${uid}`);
      const snapshot = await get(adminRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as AdminUser;
      }
      return null;
    } catch (error) {
      console.error('Error fetching admin user:', error);
      return null;
    }
  },
  
  // Create super admin in database
  createSuperAdmin: async (uid: string, email: string, name: string): Promise<void> => {
    try {
      const { ref, set } = await import('firebase/database');
      const { realtimeDb } = await import('../services/firebase');
      
      const adminUser: AdminUser = {
        uid,
        email,
        name,
        role: 'super_admin',
        permissions: SUPER_ADMIN_PERMISSIONS,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      
      const adminRef = ref(realtimeDb, `admins/${uid}`);
      await set(adminRef, adminUser);
      
      console.log('Super admin created successfully');
    } catch (error) {
      console.error('Error creating super admin:', error);
      throw error;
    }
  },
  
  // Update admin last login
  updateLastLogin: async (uid: string): Promise<void> => {
    try {
      const { ref, update } = await import('firebase/database');
      const { realtimeDb } = await import('../services/firebase');
      
      const adminRef = ref(realtimeDb, `admins/${uid}`);
      await update(adminRef, { lastLogin: Date.now() });
    } catch (error) {
      console.error('Error updating admin last login:', error);
    }
  },
  
  // Update admin permissions to latest version
  updateAdminPermissions: async (uid: string): Promise<void> => {
    try {
      const { ref, update } = await import('firebase/database');
      const { realtimeDb } = await import('../services/firebase');
      
      const adminRef = ref(realtimeDb, `admins/${uid}`);
      await update(adminRef, { permissions: SUPER_ADMIN_PERMISSIONS });
      console.log('Admin permissions updated successfully');
    } catch (error) {
      console.error('Error updating admin permissions:', error);
    }
  },
  
  // Log admin actions for audit trail (disabled - no DB writes)
  logAdminAction: async (adminUid: string, action: string, details: any): Promise<void> => {
    try {
      // Completely disabled to avoid Firebase costs. Keep console for debugging.
      console.log(`Admin action: ${action}`, { adminUid, details });
      return;
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }
};

// Admin routes configuration
export const ADMIN_ROUTES = {
  dashboard: '/admin',
  users: '/admin/users',
  locations: '/admin/locations',
  analytics: '/admin/analytics',
  reports: '/admin/reports',
  logs: '/admin/logs',
  settings: '/admin/settings',
  security: '/admin/security',
} as const;

export default adminUtils; 