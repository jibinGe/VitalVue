import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminService } from '../../services/adminService';

export default function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  // Fallback: check localStorage directly for fast initial renders
  const isAuthFromStorage = adminService.isAuthenticated();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1A1A1C',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #CCA16630', borderTopColor: '#CCA166',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthFromStorage) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
