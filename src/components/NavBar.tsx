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

  const handleLogout = async () => {
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
            
            {/* Emergency Button - Show on web for testing */}
            {!isNative && (
              <div className="flex items-center">
                <EmergencyButton variant="web" />
              </div>
            )}
            
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
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/map"
                onClick={handleNavClick}
                className={`text-sm font-medium transition ${
                  location.pathname === "/map"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Map
              </Link>
              <Link
                to="/profile"
                onClick={handleNavClick}
                className={`text-sm font-medium transition ${
                  location.pathname === "/profile"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Profile
              </Link>
              
              {/* Admin Access Button - Only show for admin users */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className={`text-sm font-medium transition ${
                    location.pathname.startsWith("/admin")
                      ? "text-red-600 dark:text-red-400"
                      : "text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
                  }`}
                >
                  Admin
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={handleMenuToggle}
              className="md:hidden text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none border-0 bg-transparent p-0"
              style={{ outline: 'none', border: 'none', background: 'transparent' }}
            >
              <svg
                className="h-5 w-5"
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-[10001]">
            <div className="px-4 py-2 space-y-2">
              <Link
                to="/map"
                onClick={handleNavClick}
                className={`block text-sm font-medium transition ${
                  location.pathname === "/map"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Map
              </Link>
              <Link
                to="/profile"
                onClick={handleNavClick}
                className={`block text-sm font-medium transition ${
                  location.pathname === "/profile"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Profile
              </Link>
              
              {/* Admin Access Button - Only show for admin users */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className={`block text-sm font-medium transition ${
                    location.pathname.startsWith("/admin")
                      ? "text-red-600 dark:text-red-400"
                      : "text-red-700 dark:text-red-300 hover:text-red-600 dark:hover:text-red-400"
                  }`}
                >
                  Admin
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="block w-full text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition"
              >
                Logout
              </button>
            </div>
          </div>
        )}
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