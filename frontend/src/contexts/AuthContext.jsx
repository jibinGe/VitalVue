import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }, [])

  // Proactive token refresh - check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      try {
        const isValid = await authService.checkAndRefreshToken();
        if (!isValid) {
          console.log('Token refresh failed, logging out');
          handleLogout();
        }
      } catch (error) {
        console.error('Error checking token:', error);
        handleLogout();
      }
    };

    // Check immediately
    checkAndRefresh();

    // Then check every 5 minutes
    const intervalId = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, handleLogout]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser()
        const authenticated = authService.isAuthenticated()

        if (authenticated && currentUser) {
          // Check and refresh token if needed
          const isValid = await authService.checkAndRefreshToken()
          
          if (isValid) {
            setUser(currentUser)
            setIsAuthenticated(true)
          } else {
            // Token refresh failed
            handleLogout()
          }
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        handleLogout()
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [handleLogout])

  const handleLogin = (userData, token, refreshToken) => {
    // Update state immediately
    setUser(userData)
    setIsAuthenticated(true)
    setIsLoading(false)
    
    // Note: authService.verifyOtp already stores tokens in localStorage
    // This ensures the state is in sync with localStorage
  }

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

