import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { ref, get } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { isProfileComplete } from "../utils/profileUtils";
import ReusableFloatingLabelInput from "../components/ui/ReusableFloatingLabelInput";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();



  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 3) {
      setError("Too many signup attempts. Please try again later.");
      return;
    }
    
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      try {
      const profileRef = ref(realtimeDb, `users/${user.uid}`);
      const snapshot = await get(profileRef);
      if (snapshot.exists()) {
        const profile = snapshot.val();
        if (isProfileComplete(profile)) {
            navigate("/map");
          } else {
            navigate("/profile?edit=true");
          }
        } else {
          navigate("/profile?edit=true");
        }
      } catch (_dbErr) {
        navigate("/profile?edit=true");
      }
    } catch (err: any) {
      setAttempts(prev => prev + 1);
      if (err.code === 'auth/email-already-in-use') {
        setError("An account with this email already exists.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* RESTRICTED ACCESS Header */}
        <div className="text-center mb-8">
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 font-bold text-lg">RESTRICTED ACCESS</span>
            </div>
            <p className="text-red-200 text-sm leading-relaxed">
              This system is restricted to authorized Guimaras Provincial Police personnel only. 
              Unauthorized access attempts will be logged and reported. 
              If you are not authorized personnel, please exit immediately.
            </p>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">Guimaras Provincial Police</h2>
            <p className="text-blue-200 text-sm">Complete your account registration</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <ReusableFloatingLabelInput
              id="email"
          type="email"
              label="Official Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              autoComplete="email"
          required
              inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-green-400 focus:ring-green-400"
              labelClassName="text-blue-200"
        />

            <div className="relative">
              <ReusableFloatingLabelInput
                id="password"
            type={showPassword ? "text" : "password"}
                label="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                inputClassName="pr-10 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-green-400 focus:ring-green-400"
                labelClassName="text-blue-200"
                autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 flex items-center z-20 px-3 cursor-pointer text-blue-200 hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
          >
                <svg className="shrink-0 size-3.5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showPassword ? (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
            ) : (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                      <line x1="2" x2="22" y1="2" y2="22"></line>
                    </>
                  )}
              </svg>
          </button>
        </div>

            <div className="relative">
              <ReusableFloatingLabelInput
                id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
                label="Confirm Password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                inputClassName="pr-10 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-green-400 focus:ring-green-400"
                labelClassName="text-blue-200"
                autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 end-0 flex items-center z-20 px-3 cursor-pointer text-blue-200 hover:text-white transition-colors"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
                <svg className="shrink-0 size-3.5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showConfirmPassword ? (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
            ) : (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                      <line x1="2" x2="22" y1="2" y2="22"></line>
                    </>
                  )}
              </svg>
          </button>
        </div>

        <button
          type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-60 disabled:transform-none shadow-lg"
          disabled={loading || attempts >= 3}
        >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
        </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-blue-200 text-sm">
              Already have access?{" "}
              <Link to="/" className="text-blue-300 hover:text-white transition-colors font-medium underline hover:no-underline">
                Sign In
            </Link>
          </span>
          </div>
        </div>



        {/* Footer */}
        <div className="mt-6 text-center text-blue-200/60 text-xs">
          <p>© 2024 Guimaras Provincial Police Office</p>
          <p className="mt-1">Secure • Reliable • Professional</p>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 