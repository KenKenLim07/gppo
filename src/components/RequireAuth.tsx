import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-700 dark:text-gray-200 text-lg font-medium">Loading Guimaras Patrol...</div>
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">Checking authentication</div>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default RequireAuth; 