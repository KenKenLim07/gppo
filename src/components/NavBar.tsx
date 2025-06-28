import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLocation as useLocationContext } from "../contexts/LocationContext";
import ToggleSwitch from "./ToggleSwitch";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { isSharingLocation, locationLoading, toggleLocation, locationError, isLive } = useLocationContext();
  const isProcessingClick = useRef(false);

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

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-[10000]">
      <div className="w-full px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xs text-gray-900 dark:text-white">Guimaras Provincial Police</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Location Toggle Switch */}
          <ToggleSwitch
            checked={isSharingLocation}
            onChange={toggleLocation}
            disabled={!user}
            loading={locationLoading}
            label="Location"
            size="sm"
            className="space-x-1"
            error={locationError}
            isLive={isLive}
          />
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/map"
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                location.pathname === "/map" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {location.pathname === "/map" && (
                <div className="mr-2 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
              <span>Map</span>
            </Link>
            <Link
              to="/profile"
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                location.pathname === "/profile" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {location.pathname === "/profile" && (
                <div className="mr-2 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
              <span>Profile</span>
            </Link>
            {user && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-700 dark:text-gray-200 focus:outline-none p-2 touch-manipulation"
            onClick={handleMenuToggle}
            aria-label="Toggle menu"
            type="button"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-[9999] border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/map"
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                location.pathname === "/map" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onClick={handleNavClick}
            >
              <span>Map</span>
            </Link>
            
            <Link
              to="/profile"
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                location.pathname === "/profile" 
                  ? "text-gray-900 dark:text-white" 
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onClick={handleNavClick}
            >
              <span>Profile</span>
            </Link>
            
            {user && (
              <button
                onClick={() => {
                  handleLogout();
                  handleNavClick();
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;