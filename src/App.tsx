import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import MapView from "./components/MapView";
import SignUp from "./pages/SignUp";
import NavBar from "./components/NavBar";
import NetworkStatus from "./components/NetworkStatus";
import RequireAuth from "./components/RequireAuth";
import { useAuth } from "./contexts/AuthContext";

function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  
  // Show NavBar on all routes except login and signup, but only if user is authenticated
  // Don't show NavBar while auth is loading to prevent flickering
  const showNav = !loading && user && (location.pathname !== "/" && location.pathname !== "/signup");

  console.log("AppRoutes render - showNav:", showNav, "user:", !!user, "loading:", loading, "location:", location.pathname);

  return (
    <>
      <NetworkStatus />
      {showNav && <NavBar />}
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
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
