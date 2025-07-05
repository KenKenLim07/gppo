import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { adminUtils } from '../utils/adminConfig';
import type { AdminUser } from '../utils/adminConfig';

interface AdminContextType {
  isAdmin: boolean;
  adminUser: AdminUser | null;
  loading: boolean;
  checkAdminStatus: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminUser: null,
  loading: true,
  checkAdminStatus: async () => {},
  hasPermission: () => false,
});

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      // Check if user email matches super admin email
      if (adminUtils.isSuperAdmin(user.email || '')) {
        // Get admin user data from database
        const adminData = await adminUtils.getAdminUser(user.uid);
        
        if (adminData) {
          setAdminUser(adminData);
          setIsAdmin(true);
          
          // Update last login
          await adminUtils.updateLastLogin(user.uid);
          
          // Update permissions to latest version (in case new permissions were added)
          await adminUtils.updateAdminPermissions(user.uid);
          
          // Refresh admin data after updating permissions
          const updatedAdminData = await adminUtils.getAdminUser(user.uid);
          setAdminUser(updatedAdminData);
        } else {
          // Create super admin if doesn't exist
          await adminUtils.createSuperAdmin(
            user.uid,
            user.email || '',
            user.displayName || 'Super Admin'
          );
          
          const newAdminData = await adminUtils.getAdminUser(user.uid);
          setAdminUser(newAdminData);
          setIsAdmin(true);
        }
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    return adminUtils.hasPermission(adminUser, permission as any);
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  return (
    <AdminContext.Provider value={{
      isAdmin,
      adminUser,
      loading,
      checkAdminStatus,
      hasPermission,
    }}>
      {children}
    </AdminContext.Provider>
  );
}; 