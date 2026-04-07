import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  
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

  // Check both state and localStorage
  if (!isAuthenticated && !isAuthFromStorage) {
    return <Navigate to="/" replace />
  }

  return children
}

