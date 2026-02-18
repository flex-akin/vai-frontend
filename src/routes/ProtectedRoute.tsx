import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/ui/Loader";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  try {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
  } catch (error) {
    // If auth context isn't ready, show loader
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }
};

export default ProtectedRoute;
