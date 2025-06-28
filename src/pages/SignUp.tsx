import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { ref, get } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { isProfileComplete } from "../utils/profileUtils";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user has a complete profile (unlikely for new signup, but good practice)
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
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <form
        onSubmit={handleSignUp}
        className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6">
          <span className="text-4xl mb-2">👮</span>
          <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            Sign Up
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            Create your officer account
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
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-semibold transition"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
        <div className="mt-4 text-center">
          <span className="text-gray-600 dark:text-gray-300 text-sm">
            Already have an account?{" "}
            <a href="/" className="text-blue-600 hover:underline">
              Login
            </a>
          </span>
        </div>
      </form>
    </div>
  );
};

export default SignUp; 