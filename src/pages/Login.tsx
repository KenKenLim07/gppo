import { useState } from "react";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { ref, get } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { isProfileComplete } from "../utils/profileUtils";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();

  // Get generic time greeting (removed "Officer" reference)
  const getTimeGreeting = () => {
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const hour = philippineTime.getHours();
    
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening";
    } else {
      return "Good Night";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting - prevent brute force attacks
    if (attempts >= 5) {
      setError("Too many login attempts. Please try again later.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user has a complete profile
      const profileRef = ref(realtimeDb, `users/${user.uid}`);
      const snapshot = await get(profileRef);
      
      if (snapshot.exists()) {
        const profile = snapshot.val();
        if (isProfileComplete(profile)) {
          navigate("/map"); // Complete profile → go to map
        } else {
          navigate("/profile"); // Incomplete profile → complete setup
        }
      } else {
        navigate("/profile"); // No profile → create one
      }
    } catch (err: any) {
      setAttempts(prev => prev + 1);
      
      // Generic error message for security
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid credentials. Please try again.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            {getTimeGreeting()}, Officer
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            Please sign in to continue
          </p>
        </div>
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 pr-10 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border-0 outline-none focus:outline-none focus:ring-0 focus:border-0"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold transition"
          disabled={loading || attempts >= 5}
        >
          {loading ? "Signing In..." : "Login"}
        </button>
        {/* Optional: Sign Up link */}
        <div className="mt-4 text-center">
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
};

export default Login; 