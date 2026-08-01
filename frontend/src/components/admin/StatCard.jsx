import React from 'react';
import { motion } from 'framer-motion';

/**
 * StatCard — Dashboard overview stat card
 * Props: title, value, icon, gradient, trend, suffix
 */
export default function StatCard({ title, value, icon: Icon, gradient, trend, suffix = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative bg-[#2F2F31]/60 backdrop-blur-xl rounded-2xl p-6 border border-white/5 hover:border-[#CCA166]/20 transition-all duration-300 overflow-hidden group cursor-default"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: gradient || 'radial-gradient(ellipse at top left, rgba(204,161,102,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-3 rounded-xl border border-white/10"
            style={{ background: 'rgba(204,161,102,0.08)' }}
          >
            {Icon && <Icon className="size-6 text-[#CCA166]" />}
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>

        <div className="mt-2">
          <p className="text-white/40 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {value ?? '—'}
            {suffix && <span className="text-lg text-white/50 ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
