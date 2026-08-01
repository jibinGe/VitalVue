import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Edit2, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * EntityTable — Reusable paginated & searchable admin data table
 *
 * Props:
 *   columns: [{ key, label, render? }]
 *   data: array of row objects
 *   isLoading: bool
 *   onEdit: (row) => void
 *   onToggleStatus: (row) => void
 *   onAdd: () => void
 *   addLabel: string
 *   searchPlaceholder: string
 *   emptyMessage: string
 */
const PAGE_SIZE = 10;

export default function EntityTable({
  columns = [],
  data = [],
  isLoading = false,
  onEdit,
  onToggleStatus,
  onRowClick,
  onAdd,
  addLabel = 'Add New',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No records found.',
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Client-side filter across all string fields
  const filtered = data.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#CCA166]/50 focus:ring-1 focus:ring-[#CCA166]/20 transition-all"
          />
        </div>

        {onAdd && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 transition-opacity shadow-lg shadow-[#CCA166]/10"
          >
            <Plus className="size-4" />
            {addLabel}
          </motion.button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#222225]">
        {/* Header */}
        <div
          className="grid text-xs font-semibold uppercase tracking-wider text-white/30 px-5 py-3 border-b border-white/5"
          style={{ gridTemplateColumns: `repeat(${columns.length + (onEdit || onToggleStatus ? 1 : 0)}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <span key={col.key}>{col.label}</span>
          ))}
          {(onEdit || onToggleStatus) && <span className="text-right">Actions</span>}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-10 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="size-12 rounded-full bg-white/5 flex items-center justify-center">
              <Search className="size-5 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <AnimatePresence>
            {paginated.map((row, i) => (
              <motion.div
                key={row.id ?? i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onRowClick && onRowClick(row)}
                className={`grid items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : ''}`}
                style={{ gridTemplateColumns: `repeat(${columns.length + (onEdit || onToggleStatus ? 1 : 0)}, minmax(0, 1fr))` }}
              >
                {columns.map((col) => (
                  <div key={col.key} className="text-sm text-white/80 truncate pr-4">
                    {col.render
                      ? col.render(row[col.key], row)
                      : col.key === 'is_active' || col.key === 'status'
                      ? <StatusBadge status={row[col.key]} />
                      : (row[col.key] ?? '—')}
                  </div>
                ))}

                {(onEdit || onToggleStatus) && (
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-[#CCA166]/10 text-white/50 hover:text-[#CCA166] border border-white/5 hover:border-[#CCA166]/20 transition-all duration-200"
                        title="Edit"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                    )}
                    {onToggleStatus && (
                      <button
                        onClick={() => onToggleStatus(row)}
                        className={`p-2 rounded-lg border transition-all duration-200 ${
                          row.is_active || row.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                            : 'bg-white/5 border-white/10 text-white/40 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'
                        }`}
                        title="Toggle Status"
                      >
                        {row.is_active || row.status === 'active'
                          ? <ToggleRight className="size-3.5" />
                          : <ToggleLeft className="size-3.5" />
                        }
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
