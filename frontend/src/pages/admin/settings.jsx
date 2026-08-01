import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Activity, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function AdminSettings() {
  const { admin } = useAdminAuth();
  const [loggingStatus, setLoggingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  const fetchStatus = async () => {
    setLoading(true);
    const res = await adminService.getLoggingStatus();
    if (res.success) {
      const d = res.data;
      // Backend may return { status: 'on' | 'off' } or { logging_enabled: bool }
      setLoggingStatus(d?.status === 'on' || d?.logging_enabled === true || d?.enabled === true);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleToggle = async () => {
    setToggling(true);
    setMessage(null);
    const res = loggingStatus
      ? await adminService.disableLogging()
      : await adminService.enableLogging();
    setToggling(false);

    if (res.success) {
      setLoggingStatus((prev) => !prev);
      setMessage({ type: 'success', text: `Logging has been ${loggingStatus ? 'disabled' : 'enabled'} successfully.` });
    } else {
      setMessage({ type: 'error', text: res.message || 'Failed to toggle logging.' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
          <Settings className="size-5 text-[#CCA166]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-white/35 text-sm">System configuration and administrative controls</p>
        </div>
      </motion.div>

      {/* Toast notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/8 border-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logging control card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center gap-3 mb-2">
          <Activity className="size-5 text-[#CCA166]" />
          <h2 className="text-white font-semibold text-base">System Logging</h2>
          <button
            onClick={fetchStatus}
            className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        <p className="text-white/40 text-sm leading-relaxed">
          Control server-side logging. When enabled, all API requests, errors, and critical events are recorded for audit and debugging purposes.
        </p>

        {/* Status display */}
        <div className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-white">Logging Status</span>
            {loading ? (
              <span className="text-xs text-white/30">Fetching status...</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${loggingStatus ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                <span className={`text-xs font-medium ${loggingStatus ? 'text-emerald-400' : 'text-white/40'}`}>
                  {loggingStatus ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            disabled={loading || toggling}
            className={`relative flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
              loggingStatus
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-gradient-to-r from-[#B2884D] to-[#CCA166] text-white shadow-lg shadow-[#CCA166]/15 hover:opacity-90'
            }`}
          >
            {toggling ? (
              <div className="size-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : loggingStatus ? (
              <ToggleRight className="size-4" />
            ) : (
              <ToggleLeft className="size-4" />
            )}
            {toggling ? 'Updating...' : loggingStatus ? 'Disable Logging' : 'Enable Logging'}
          </motion.button>
        </div>
      </motion.div>

      {/* Admin account info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <Shield className="size-5 text-[#CCA166]" />
          <h2 className="text-white font-semibold text-base">Admin Account</h2>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Admin ID', value: admin?.id },
            { label: 'Full Name', value: admin?.name },
            { label: 'Role', value: admin?.role || 'master_admin' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <span className="text-sm text-white/40">{label}</span>
              <span className="text-sm text-white font-medium">{value || '—'}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#CCA166]/5 border border-[#CCA166]/10 rounded-lg">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/40">Active admin session — All changes are logged for audit trail.</span>
        </div>
      </motion.div>
    </div>
  );
}
