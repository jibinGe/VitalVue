import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './assets/scss/style.scss'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { WardProvider } from './contexts/WardContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WardProvider>
          <App />
        </WardProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
