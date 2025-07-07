import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
}

const AuthGuard = ({ 
  children, 
  requireAdmin = false,
  requireAuth = true 
}: AuthGuardProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // Redirect to login if authentication is required and user isn't logged in
    if (requireAuth && !user) {
      navigate('/auth');
      return;
    }

    // Redirect to dashboard if admin privileges are required but user isn't admin
    if (requireAdmin && !isAdmin) {
      navigate('/dashboard');
      return;
    }

    // Redirect to dashboard if user is already logged in and tries to access auth page
    if (!requireAuth && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, isAdmin, navigate, requireAuth, requireAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) return null;
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
};

export default AuthGuard;
