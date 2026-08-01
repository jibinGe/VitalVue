import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Navigate } from "react-router-dom";

// main layout
import Index from './layout/index'
import Error from './pages/error'

// auth — kept eager (tiny, needed immediately on cold load)
import Login from './pages/auth/login'
import Signup from './pages/auth/signup'
import Verify from './pages/auth/verify'
import TvLogin from './pages/auth/tv-login'
import ProtectedRoute from './components/auth/ProtectedRoute'

// dashboard layout — eager (always needed once authenticated)
import Layout from './layout/dashboard/layout'

// ── Admin (eager — separate entry point with its own auth) ──────────────
import AdminLogin from './pages/admin/login'
import AdminLayout from './layout/admin/AdminLayout'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'

// Admin pages — lazy loaded
const AdminDashboard = lazy(() => import('./pages/admin/dashboard'))
const AdminOrganizations = lazy(() => import('./pages/admin/organizations'))
const AdminOrganizationDetails = lazy(() => import('./pages/admin/OrganizationDetails'))
const AdminDepartments = lazy(() => import('./pages/admin/departments'))
const AdminWards = lazy(() => import('./pages/admin/wards'))
const AdminStaff = lazy(() => import('./pages/admin/staff'))
const AdminSettings = lazy(() => import('./pages/admin/settings'))

// dashboard pages — lazy loaded for code splitting
const HeartRate = lazy(() => import('./pages/dashboard/overview/heart-rate'))
const Spo = lazy(() => import('./pages/dashboard/overview/spo'))
const BpTrend = lazy(() => import('./pages/dashboard/overview/bp-trend'))
const Temperature = lazy(() => import('./pages/dashboard/overview/temperature'))
const HrvScore = lazy(() => import('./pages/dashboard/overview/hrv-score'))
const Movement = lazy(() => import('./pages/dashboard/overview/movement'))
const SleepPattern = lazy(() => import('./pages/dashboard/overview/sleep-pattern'))
const Stress            = lazy(() => import('./pages/dashboard/overview/stress'))
const Overview = lazy(() => import('./pages/dashboard/overview/overview'))
const Home = lazy(() => import('./pages/dashboard/home'))
const PatientArchives = lazy(() => import('./pages/dashboard/patient-archives'))
const Control = lazy(() => import('./pages/dashboard/control'))
const Control2 = lazy(() => import('./pages/dashboard/control-2'))
const Control3 = lazy(() => import('./pages/dashboard/control-3'))
const Profile = lazy(() => import('./pages/dashboard/profile'))
const NotificationsPage = lazy(() => import('./pages/dashboard/notifications'))
const ShareVitalsPage   = lazy(() => import('./pages/dashboard/share-vitals'))
const ShareVitalDetailPage = lazy(() => import('./pages/dashboard/share-vital-detail'))
const TvDashboard       = lazy(() => import('./pages/dashboard/tv-dashboard'))

// Minimal themed loading fallback shown between route navigations
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#1A1A1C',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      border: '3px solid #CCA16630',
      borderTopColor: '#CCA166',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

const router = createBrowserRouter([
  {
    path: '',
    element: <Index />,
    errorElement: <Error />,
    children: [
      { path: '/', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/verify', element: <Verify /> },
    ]
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard/home" replace />,
      },
      // All dashboard children are wrapped in a single Suspense so the
      // loading spinner shows during lazy-chunk fetching on first visit.
      {
        path: 'home',
        element: <Suspense fallback={<PageLoader />}><Home /></Suspense>,
      },
      {
        path: 'overview/:userId?',
        element: <Suspense fallback={<PageLoader />}><Overview /></Suspense>,
      },
      {
        path: 'heart-rate/:userId?',
        element: <Suspense fallback={<PageLoader />}><HeartRate /></Suspense>,
      },
      {
        path: 'spo/:userId?',
        element: <Suspense fallback={<PageLoader />}><Spo /></Suspense>,
      },
      {
        path: 'bp-trend/:userId?',
        element: <Suspense fallback={<PageLoader />}><BpTrend /></Suspense>,
      },
      {
        path: 'temperature/:userId?',
        element: <Suspense fallback={<PageLoader />}><Temperature /></Suspense>,
      },
      {
        path: 'hrv-score/:userId?',
        element: <Suspense fallback={<PageLoader />}><HrvScore /></Suspense>,
      },
      {
        path: 'movement/:userId?',
        element: <Suspense fallback={<PageLoader />}><Movement /></Suspense>,
      },
      {
        path: 'sleep-pattern/:userId?',
        element: <Suspense fallback={<PageLoader />}><SleepPattern /></Suspense>,
      },
      {
        path: 'stress/:userId?',
        element: <Suspense fallback={<PageLoader />}><Stress /></Suspense>,
      },
      {
        path: 'patient-archives',
        element: <Suspense fallback={<PageLoader />}><PatientArchives /></Suspense>,
      },
      {
        path: 'control',
        element: <Suspense fallback={<PageLoader />}><Control /></Suspense>,
      },
      {
        path: 'control-2',
        element: <Suspense fallback={<PageLoader />}><Control2 /></Suspense>,
      },
      {
        path: 'control-3',
        element: <Suspense fallback={<PageLoader />}><Control3 /></Suspense>,
      },
      {
        path: 'profile',
        element: <Suspense fallback={<PageLoader />}><Profile /></Suspense>,
      },
      {
        path: 'notifications',
        element: <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>,
      },
    ]
  },
  {
    // Standalone — no Layout/Header wrapper, pure mobile view
    path: '/dashboard/share-vitals/:patientId',
    element: (
      <Suspense fallback={<PageLoader />}><ShareVitalsPage /></Suspense>
    ),
    errorElement: <Error />,
  },
  {
    path: '/dashboard/share-vitals/:patientId/:metric',
    element: (
      <Suspense fallback={<PageLoader />}><ShareVitalDetailPage /></Suspense>
    ),
    errorElement: <Error />,
  },
  {
    // Standalone — no layout wrapper, QR-only TV authentication
    path: '/tv-login',
    element: <TvLogin />,
    errorElement: <Error />,
  },
  {
    path: '/tv',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}><TvDashboard /></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <Error />,
  },

  // ── Admin Portal — completely separate from staff dashboard ─────────────
  {
    // Standalone login — no AdminLayout wrapper, no auth guard
    path: '/admin/login',
    element: <AdminLogin />,
    errorElement: <Error />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>,
      },
      {
        path: 'organizations',
        element: <Suspense fallback={<PageLoader />}><AdminOrganizations /></Suspense>,
      },
      {
        path: 'organizations/:id',
        element: <Suspense fallback={<PageLoader />}><AdminOrganizationDetails /></Suspense>,
      },
      {
        path: 'departments',
        element: <Suspense fallback={<PageLoader />}><AdminDepartments /></Suspense>,
      },
      {
        path: 'wards',
        element: <Suspense fallback={<PageLoader />}><AdminWards /></Suspense>,
      },
      {
        path: 'staff',
        element: <Suspense fallback={<PageLoader />}><AdminStaff /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>,
      },
    ],
  },
])

export default function App() {
  return (
    <RouterProvider router={router} />
  )
}

