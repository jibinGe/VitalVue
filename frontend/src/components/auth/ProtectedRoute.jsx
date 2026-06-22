import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  
  // Fallback check: also verify localStorage directly
  // This helps when state hasn't updated yet after login
  const isAuthFromStorage = authService.isAuthenticated()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated && !isAuthFromStorage) {
    return <Navigate to="/" state={{ from: location.pathname + location.search }} replace />
  }

  return children
}

