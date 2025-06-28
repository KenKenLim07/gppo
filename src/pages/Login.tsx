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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err) {
      setError("Invalid credentials. Please try again.");
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
          <span className="text-4xl mb-2">👮</span>
          <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            Police Login
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold transition"
          disabled={loading}
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