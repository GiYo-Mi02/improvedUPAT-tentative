import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { state, isAdmin, isStaff } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-luxury-gold"></div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin && !isStaff) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
