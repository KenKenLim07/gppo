import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLocation as useLocationContext } from "../contexts/LocationContext";
import { useAdmin } from "../contexts/AdminContext";
import ToggleSwitch from "./ToggleSwitch";
import ErrorModal from "./ErrorModal";
import EmergencyButton from "./EmergencyButton";
import { Capacitor } from '@capacitor/core';
import { ref } from "firebase/database";
import { realtimeDb } from "../services/firebase";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { 
    isSharingLocation, 
    locationLoading, 
    toggleLocation, 
    locationError, 
    isLive,
    backgroundTrackingActive,
    toggleBackgroundTracking
  } = useLocationContext();
  const isProcessingClick = useRef(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Only show background tracking on native platforms
  const isNative = Capacitor.isNativePlatform();

  // Show error modal when locationError changes
  useEffect(() => {
    if (locationError) {
      setErrorModal({
        isOpen: true,
        title: 'GPS Error',
        message: locationError,
        type: 'error'
      });
    }
  }, [locationError]);

  // Fetch current status on mount (for mobile menu)
  useEffect(() => {
    if (!user) return;
    const profileRef = ref(realtimeDb, `users/${user.uid}`);
    import('firebase/database').then(({ get }) => {
      get(profileRef).then((snapshot) => {
        if (snapshot.exists()) {
          // Profile data fetched, but not used
        }
      });
    });
  }, [user]);

  // Close dropdown on click outside or ESC
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen]);

  // Focus trap for dropdown
  useEffect(() => {
    if (!menuOpen || !dropdownRef.current) return;
    const focusable = dropdownRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [menuOpen]);

  const handleLogout = async () => {
    // Clean up location data on logout
    if (user) {
      try {
        const { ref, set, get } = await import('firebase/database');
        const { realtimeDb } = await import('../services/firebase');
        
        // First, get the current user data to preserve existing fields
        const userRef = ref(realtimeDb, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        let existingData = {};
        if (snapshot.exists()) {
          existingData = snapshot.val();
        }
        
        // Immediately remove location data and set sharing to false
        await set(userRef, {
          ...existingData, // Preserve all existing fields (including isHiddenFromMap)
          lat: null,
          lng: null,
          isSharingLocation: false,
          lastUpdated: null,
          logoutTime: Date.now()
        });
        
        console.log('Location data cleaned up on logout');
      } catch (error) {
        console.error('Error cleaning up location data on logout:', error);
      }
    }
    
    await signOut(auth);
    navigate("/");
  };

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessingClick.current) {
      return;
    }
    
    isProcessingClick.current = true;
    
    setMenuOpen(prev => !prev);
    
    setTimeout(() => {
      isProcessingClick.current = false;
    }, 100);
  }, []);

  const handleNavClick = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const closeErrorModal = () => {
    setErrorModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 fixed top-0 left-0 right-0 z-[10000] h-12">
        <div className="w-full px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs text-gray-900 dark:text-white">Guimaras Provincial Police</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Emergency Button - Show on web for testing */}
            {!isNative && (
              <div className="flex items-center">
                <EmergencyButton variant="web" />
              </div>
            )}
            
            {/* Location Toggle Switch - Show on both web and mobile */}
            <ToggleSwitch
              checked={isSharingLocation}
              onChange={toggleLocation}
              disabled={!user}
              loading={locationLoading}
              label="GPS"
              size="sm"
              className="space-x-1"
              error={null}
              isLive={isLive}
            />
            
            {/* Background Tracking Toggle Switch - Only show on native platforms */}
            {isNative && (
              <ToggleSwitch
                checked={backgroundTrackingActive}
                onChange={toggleBackgroundTracking}
                disabled={!user || !isSharingLocation}
                loading={false}
                label="Background"
                size="sm"
                className="space-x-1"
                error={null}
                isLive={backgroundTrackingActive}
              />
            )}
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/map"
                onClick={handleNavClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === "/map"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
                Map
              </Link>
              <Link
                to="/profile"
                onClick={handleNavClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === "/profile"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              
              {/* Admin Access Button - Only show for admin users */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname.startsWith("/admin")
                      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      : "text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Admin
                </Link>
              )}
              
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              ref={menuButtonRef}
              onClick={handleMenuToggle}
              className="md:hidden text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none border-0 bg-transparent p-0 relative"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu-dropdown"
              style={{ outline: 'none', border: 'none', background: 'transparent' }}
            >
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Professional Dropdown Mobile Menu */}
        <div className="relative md:hidden">
        {menuOpen && (
            <div
              ref={dropdownRef}
              id="mobile-menu-dropdown"
              role="menu"
              aria-labelledby="mobile-menu-button"
              tabIndex={-1}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl z-[10001] animate-dropdown-fade-scale origin-top-right focus:outline-none"
              style={{ minWidth: '12rem' }}
            >
              {/* Arrow */}
              <div className="absolute -top-2 right-4 w-4 h-4 overflow-hidden">
                <svg width="16" height="16" viewBox="0 0 16 16" className="block mx-auto">
                  <polygon points="8,0 16,16 0,16" fill="white" className="dark:fill-gray-800" />
                  <polygon points="8,1 15,15 1,15" fill="#e5e7eb" className="dark:fill-gray-700" />
                </svg>
              </div>
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.email}</div>
                  </div>
                </div>
              )}
              <div className="flex flex-col py-2">
              <Link
                to="/map"
                onClick={handleNavClick}
                  className={`flex items-center gap-3 px-5 py-3 text-base font-medium transition rounded-none hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  location.pathname === "/map"
                      ? "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 font-bold"
                      : "text-gray-700 dark:text-gray-200"
                }`}
                  role="menuitem"
                  tabIndex={0}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" /></svg>
                Map
              </Link>
              <Link
                to="/profile"
                onClick={handleNavClick}
                  className={`flex items-center gap-3 px-5 py-3 text-base font-medium transition rounded-none hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  location.pathname === "/profile"
                      ? "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 font-bold"
                      : "text-gray-700 dark:text-gray-200"
                }`}
                  role="menuitem"
                  tabIndex={0}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Profile
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                    className={`flex items-center gap-3 px-5 py-3 text-base font-medium transition rounded-none hover:bg-red-50 dark:hover:bg-red-900/20 ${
                    location.pathname.startsWith("/admin")
                        ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 font-bold"
                        : "text-red-700 dark:text-red-300"
                  }`}
                    role="menuitem"
                    tabIndex={0}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3m10-5h2a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h2" /></svg>
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-3 text-base font-medium text-red-600 dark:text-red-400 transition rounded-none hover:bg-red-50 dark:hover:bg-red-900/20"
                  role="menuitem"
                  tabIndex={0}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </div>
        )}
        </div>
      </nav>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
      />
    </>
  );
};

export default NavBar;