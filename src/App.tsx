import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { Suspense, lazy } from "react";
import NavBar from "./components/NavBar";
import MobileNavigation from "./components/MobileNavigation";
import NetworkStatus from "./components/NetworkStatus";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import { useLocation as useLocationContext } from "./contexts/LocationContext";
import { AdminProvider } from "./contexts/AdminContext";
import { useEffect } from "react";
import { registerPush } from "./services/pushNotifications";
import { useAppCloseDetection } from "./hooks/useAppCloseDetection";
import { backgroundTrackingService } from './services/backgroundTracking';

// Replace static imports with lazy imports
const Login = lazy(() => import("./pages/Login"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const MapView = lazy(() => import("./components/MapView"));
const SignUp = lazy(() => import("./pages/SignUp"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));

function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isSharingLocation } = useLocationContext();
  
  // Detect platform
  const isNative = Capacitor.isNativePlatform();
  
  // Use app close detection hook
  useAppCloseDetection(user?.uid || null, isSharingLocation);
  
  // Register push notifications on native platforms
  useEffect(() => {
    if (isNative) {
      registerPush();
    }
  }, [isNative]);
  
  // Show navigation on all routes except login, signup, forgot, and profile, but only if user is authenticated
  // Don't show navigation while auth is loading to prevent flickering
  const showNavigation = !loading && user && (
    location.pathname !== "/" &&
    location.pathname !== "/signup" &&
    location.pathname !== "/forgot" &&
    location.pathname !== "/profile"
  );

  console.log("AppRoutes render - showNavigation:", showNavigation, "user:", !!user, "loading:", loading, "location:", location.pathname, "platform:", isNative ? "native" : "web");

  return (
    <>
      <NetworkStatus />
      {showNavigation && (
        isNative ? <MobileNavigation /> : <NavBar />
      )}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-700 dark:text-gray-200 text-lg font-medium">Loading Guimaras Patrol...</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">Initializing application</div>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileSetup />
              </RequireAuth>
            }
          />
          <Route
            path="/map"
            element={
              <RequireAuth>
                <MapView />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  useEffect(() => {
    // Start tracking once on mount
    backgroundTrackingService.startTracking();

    // Optional: Clean up on unmount
    return () => {
      backgroundTrackingService.stopTracking();
    };
  }, []);
  return (
    <BrowserRouter>
      <AdminProvider>
        <AppRoutes />
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
