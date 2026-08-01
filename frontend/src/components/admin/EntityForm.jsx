import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * EntityForm — Slide-in drawer for Create / Edit operations
 *
 * Props:
 *   isOpen: bool
 *   onClose: () => void
 *   onSubmit: (formData) => void
 *   title: string
 *   submitLabel: string
 *   isLoading: bool
 *   children: form fields JSX
 */
export default function EntityForm({
  isOpen,
  onClose,
  onSubmit,
  title = 'Create New',
  submitLabel = 'Save',
  isLoading = false,
  children,
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-[#1C1C1F] border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <h3 className="text-white font-semibold text-lg">{title}</h3>
                <p className="text-white/40 text-sm mt-0.5">Fill in the details below</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {children}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-5 border-t border-white/5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm text-white/60 hover:text-white border border-white/10 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : submitLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * FormField — consistent label + input within EntityForm
 */
export function FormField({ label, error, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/60">
        {label}
        {required && <span className="text-[#CCA166] ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * AdminInput — styled input for admin forms
 */
export function AdminInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#CCA166]/50 focus:ring-1 focus:ring-[#CCA166]/20 transition-all ${className}`}
    />
  );
}

/**
 * AdminSelect — styled select for admin forms
 */
export function AdminSelect({ children, className = '', ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3 bg-[#222225] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50 focus:ring-1 focus:ring-[#CCA166]/20 transition-all appearance-none ${className}`}
    >
      {children}
    </select>
  );
}
