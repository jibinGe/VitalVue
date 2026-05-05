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

  // Listen for unauthorized events from apiClient (e.g. refresh token failed)
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn('Unauthorized event received, logging out user.');
      handleLogout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [handleLogout]);

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

