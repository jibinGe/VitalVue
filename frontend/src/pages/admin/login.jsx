import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const STEPS = { ID: 'id', OTP: 'otp', };

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAdminAuth();

  const [step, setStep] = useState(STEPS.ID);
  const [adminId, setAdminId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);

  // Already authenticated → redirect
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/admin/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  // Countdown for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: Submit admin ID ──────────────────────────────
  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!adminId.trim()) return;
    setError('');
    setIsLoading(true);

    const res = await adminService.loginInitiate(adminId.trim());
    setIsLoading(false);

    if (res.success) {
      setStep(STEPS.OTP);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(res.message);
    }
  };

  // ── OTP input handling ───────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    setError('');
    setIsLoading(true);

    const res = await adminService.verifyOtp(code);
    setIsLoading(false);

    if (res.success) {
      login(res.data.admin);
      const from = location.state?.from || '/admin/dashboard';
      navigate(from, { replace: true });
    } else {
      setError(res.message);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (step === STEPS.OTP && otp.every((d) => d !== '')) {
      handleOtpSubmit();
    }
  }, [otp, step]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    const res = await adminService.resendOtp();
    if (res.success) {
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#CCA166]/6 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[#B2884D]/4 blur-[100px] rounded-full" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(204,161,102,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(204,161,102,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-[#1C1C1F]/90 backdrop-blur-2xl border border-white/8 rounded-3xl shadow-2xl overflow-hidden">
          {/* Gold top strip */}
          <div className="h-1 w-full bg-gradient-to-r from-[#B2884D] via-[#CCA166] to-[#B2884D]" />

          <div className="p-8 md:p-10">
            {/* Icon + heading */}
            <div className="flex flex-col items-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                className="relative mb-5"
              >
                <div className="size-16 rounded-2xl bg-gradient-to-br from-[#B2884D] to-[#CCA166] flex items-center justify-center shadow-xl shadow-[#CCA166]/20">
                  <Shield className="size-8 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#B2884D] to-[#CCA166] blur-xl opacity-30 -z-10" />
              </motion.div>

              <h1 className="text-2xl font-bold text-white mb-1">Admin Portal</h1>
              <p className="text-white/40 text-sm text-center">
                {step === STEPS.ID
                  ? 'Master admin access only. Enter your Admin ID to continue.'
                  : `OTP sent to your registered device. Enter the 6-digit code.`}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[STEPS.ID, STEPS.OTP].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-2 ${step === s ? 'text-[#CCA166]' : step === STEPS.OTP && s === STEPS.ID ? 'text-emerald-400' : 'text-white/20'}`}>
                    <div className={`size-6 rounded-full border text-xs font-bold flex items-center justify-center transition-all ${
                      step === s
                        ? 'border-[#CCA166] bg-[#CCA166]/10'
                        : step === STEPS.OTP && s === STEPS.ID
                        ? 'border-emerald-400 bg-emerald-400/10'
                        : 'border-white/10'
                    }`}>
                      {step === STEPS.OTP && s === STEPS.ID ? '✓' : i + 1}
                    </div>
                    <span className="text-xs font-medium">{s === STEPS.ID ? 'Admin ID' : 'Verify OTP'}</span>
                  </div>
                  {i === 0 && <div className="flex-1 h-px bg-white/10" />}
                </React.Fragment>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl mb-5"
                >
                  <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── STEP 1: Admin ID ── */}
            <AnimatePresence mode="wait">
              {step === STEPS.ID && (
                <motion.form
                  key="id-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleIdSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/50">Admin ID</label>
                    <input
                      id="admin-id-input"
                      type="text"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                      placeholder="e.g. ADMIN-001"
                      autoFocus
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#CCA166]/50 focus:ring-2 focus:ring-[#CCA166]/10 transition-all text-base"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!adminId.trim() || isLoading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-[#CCA166]/15"
                  >
                    {isLoading ? (
                      <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Send OTP <ArrowRight className="size-4" /></>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === STEPS.OTP && (
                <motion.div
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* OTP Boxes */}
                  <div>
                    <label className="text-sm font-medium text-white/50 mb-3 block">6-Digit OTP</label>
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => (otpRefs.current[i] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className={`size-12 text-center text-xl font-bold rounded-xl border transition-all focus:outline-none
                            ${digit
                              ? 'bg-[#CCA166]/10 border-[#CCA166]/40 text-[#CCA166]'
                              : 'bg-white/5 border-white/10 text-white'}
                            focus:border-[#CCA166]/60 focus:ring-2 focus:ring-[#CCA166]/10
                          `}
                        />
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOtpSubmit}
                    disabled={otp.join('').length < 6 || isLoading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-[#CCA166]/15"
                  >
                    {isLoading ? (
                      <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Verify & Enter <Shield className="size-4" /></>
                    )}
                  </motion.button>

                  {/* Resend + back */}
                  <div className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => { setStep(STEPS.ID); setError(''); setOtp(['', '', '', '', '', '']); }}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      ← Change ID
                    </button>
                    <button
                      onClick={handleResend}
                      disabled={countdown > 0}
                      className="flex items-center gap-1.5 text-white/40 hover:text-[#CCA166] disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className="size-3.5" />
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/20 mt-6">
          VitalVue Master Admin Portal — Restricted Access Only
        </p>
      </motion.div>
    </div>
  );
}
