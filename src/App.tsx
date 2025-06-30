import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import MapView from "./components/MapView";
import SignUp from "./pages/SignUp";
import AdminDashboard from "./pages/AdminDashboard";
import NavBar from "./components/NavBar";
import MobileNavigation from "./components/MobileNavigation";
import NetworkStatus from "./components/NetworkStatus";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext";

function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Detect platform
  const isNative = Capacitor.isNativePlatform();
  
  // Show navigation on all routes except login and signup, but only if user is authenticated
  // Don't show navigation while auth is loading to prevent flickering
  const showNavigation = !loading && user && (location.pathname !== "/" && location.pathname !== "/signup");

  console.log("AppRoutes render - showNavigation:", showNavigation, "user:", !!user, "loading:", loading, "location:", location.pathname, "platform:", isNative ? "native" : "web");

  return (
    <>
      <NetworkStatus />
      {showNavigation && (
        isNative ? <MobileNavigation /> : <NavBar />
      )}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
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
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <AppRoutes />
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
