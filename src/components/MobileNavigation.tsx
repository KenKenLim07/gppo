import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLocation as useLocationContext } from '../contexts/LocationContext';
import ToggleSwitch from './ToggleSwitch';
import ErrorModal from './ErrorModal';
import EmergencyButton from './EmergencyButton';

const MobileNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });
  const { user } = useAuth();
  const { 
    isSharingLocation, 
    locationLoading, 
    toggleLocation, 
    locationError, 
    isLive,
    backgroundTrackingActive,
    toggleBackgroundTracking
  } = useLocationContext();

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
    setDrawerOpen(false);
  };

  const handleNavClick = () => {
    setDrawerOpen(false);
  };

  const closeErrorModal = () => {
    setErrorModal(prev => ({ ...prev, isOpen: false }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[10000]">
        <div className="flex items-center justify-around py-2">
          {/* Map Tab */}
          <Link
            to="/map"
            onClick={handleNavClick}
            className={`flex flex-col items-center p-2 rounded-lg transition ${
              isActive('/map')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
            <span className="text-xs font-medium">Map</span>
          </Link>

          {/* Profile Tab */}
          <Link
            to="/profile"
            onClick={handleNavClick}
            className={`flex flex-col items-center p-2 rounded-lg transition ${
              isActive('/profile')
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>

          {/* Menu Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Floating Location Controls */}
      <div className="fixed top-4 right-4 z-[10001] space-y-2 flex flex-col items-end">
        {/* Location Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
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
        </div>

        {/* Background Tracking Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700">
          <ToggleSwitch
            checked={backgroundTrackingActive}
            onChange={toggleBackgroundTracking}
            disabled={!user || !isSharingLocation}
            loading={false}
            label="BG"
            size="sm"
            className="space-x-1"
            error={null}
            isLive={backgroundTrackingActive}
          />
        </div>

        {/* Compact Floating SOS Button */}
        <EmergencyButton variant="mobile" />
      </div>

      {/* Drawer Menu */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[10002]"
            onClick={() => setDrawerOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-[10003] transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Guimaras Patrol
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isSharingLocation ? 'Location Active' : 'Location Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-sm p-4 flex flex-col gap-2">
                <Link
                  to="/map"
                  onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-base font-medium ${
                    isActive('/map')
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                  </svg>
                    Map
                </Link>
                <Link
                  to="/profile"
                  onClick={handleNavClick}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-base font-medium ${
                    isActive('/profile')
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-sm p-4 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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

export default MobileNavigation; 