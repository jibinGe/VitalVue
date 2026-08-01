import React from 'react';
import { motion } from 'framer-motion';

/**
 * StatusBadge — Active / Inactive / Occupied / Available pill
 */
export default function StatusBadge({ status }) {
  const isActive =
    status === true ||
    status === 'active' ||
    status === 'occupied' ||
    status === 'on' ||
    status === 'enabled';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
        ${isActive
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-white/5 text-white/40 border border-white/10'
        }
      `}
    >
      <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
      {isActive ? (typeof status === 'string' ? status : 'Active') : (typeof status === 'string' ? status : 'Inactive')}
    </span>
  );
}
