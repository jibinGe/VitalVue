import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, GitBranch, BedDouble,
  Users, Settings, LogOut, ChevronLeft, ChevronRight,
  Activity, Shield, Menu, X,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/admin/organizations', icon: Building2, label: 'Organizations' },
      { to: '/admin/departments', icon: GitBranch, label: 'Departments' },
      { to: '/admin/wards', icon: BedDouble, label: 'Wards & Beds' },
    ],
  },
  {
    label: 'Staff',
    items: [
      { to: '/admin/staff', icon: Users, label: 'Doctors & Nurses' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 72;

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="flex min-h-screen bg-[#1A1A1C] text-white">
      {/* ── Mobile overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: w }}
        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
        className="fixed top-0 left-0 h-full z-40 flex flex-col bg-[#1E1E21] border-r border-white/5 overflow-hidden"
        style={{
          width: w,
          // On mobile, slide in/out
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-3 px-4 h-[72px] border-b border-white/5 shrink-0">
          <div className="size-9 rounded-xl bg-gradient-to-br from-[#B2884D] to-[#CCA166] flex items-center justify-center shrink-0 shadow-lg shadow-[#CCA166]/20">
            <Shield className="size-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-white font-bold text-base leading-none">VitalVue</p>
                <p className="text-[#CCA166] text-xs font-medium mt-0.5">Master Admin</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-all"
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-3 mb-2"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                      ${isActive
                        ? 'bg-[#CCA166]/12 text-[#CCA166] border border-[#CCA166]/15'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`size-[18px] shrink-0 ${isActive ? 'text-[#CCA166]' : 'text-white/40 group-hover:text-white/70'}`} />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.13 }}
                              className="whitespace-nowrap"
                            >
                              {label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Tooltip when collapsed */}
                        {collapsed && (
                          <div className="absolute left-full ml-3 px-3 py-2 bg-[#2A2A2D] border border-white/10 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                            {label}
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="px-3 py-4 border-t border-white/5 shrink-0 space-y-2">
          {/* User info */}
          <AnimatePresence>
            {!collapsed && admin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 py-2.5 rounded-xl bg-white/3 border border-white/5"
              >
                <p className="text-xs text-white/30 mb-0.5">Logged in as</p>
                <p className="text-sm text-white font-medium leading-none truncate">{admin.name || admin.id}</p>
                <p className="text-xs text-[#CCA166]/70 mt-0.5">{admin.role || 'master_admin'}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all group relative"
          >
            <LogOut className="size-[18px] shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
            {collapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 bg-[#2A2A2D] border border-white/10 rounded-lg text-sm text-red-400 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Main Content ───────────────────────────────────── */}
      <motion.main
        animate={{ marginLeft: w }}
        transition={{ type: 'spring', damping: 24, stiffness: 200 }}
        className="flex-1 flex flex-col min-h-screen"
      >
        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#1A1A1C]/90 backdrop-blur-xl border-b border-white/5 h-[72px]">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white/60"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <Activity className="size-4 text-[#CCA166]/60" />
            <span className="text-xs text-white/30">Admin Portal</span>
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
