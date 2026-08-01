import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(() => {
    adminService.logout();
    setAdmin(null);
    setIsAuthenticated(false);
  }, []);

  // Initialize admin auth state from localStorage
  useEffect(() => {
    const init = () => {
      try {
        const currentAdmin = adminService.getCurrentAdmin();
        const authenticated = adminService.isAuthenticated();
        if (authenticated && currentAdmin) {
          setAdmin(currentAdmin);
          setIsAuthenticated(true);
        } else {
          setAdmin(null);
          setIsAuthenticated(false);
        }
      } catch {
        setAdmin(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = (adminData) => {
    setAdmin(adminData);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const value = {
    admin,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};
