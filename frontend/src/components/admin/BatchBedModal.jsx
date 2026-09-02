import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';

export default function BatchBedModal({
  isOpen,
  onClose,
  onSuccess,
  wardId,
  wardName,
}) {
  const [prefix, setPrefix] = useState('B-');
  const [startNo, setStartNo] = useState(101);
  const [count, setCount] = useState(10);
  const [padZeroes, setPadZeroes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generated preview list
  const previewBeds = useMemo(() => {
    const list = [];
    const n = Math.min(Math.max(1, Number(count) || 1), 50); // cap at 50 for safety
    const start = Math.max(1, Number(startNo) || 1);
    for (let i = 0; i < n; i++) {
      const num = start + i;
      const formattedNum = padZeroes ? String(num).padStart(3, '0') : String(num);
      list.push(`${prefix.trim()}${formattedNum}`);
    }
    return list;
  }, [prefix, startNo, count, padZeroes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wardId) {
      setError('Ward ID is missing.');
      return;
    }
    if (previewBeds.length === 0) {
      setError('Please specify at least 1 bed to create.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await adminService.createBedsBatch({
      ward_id: Number(wardId),
      bed_numbers: previewBeds,
    });

    setLoading(false);
    if (res.success) {
      onSuccess?.(previewBeds.length);
      onClose();
    } else {
      setError(res.message || 'Failed to generate beds. They may already exist.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#1E1E21] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#252528]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#CCA166]/15 border border-[#CCA166]/25 rounded-xl text-[#CCA166]">
                <Layers className="size-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Batch Bed Generator</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Generating beds for <span className="text-[#CCA166] font-medium">{wardName || `Ward #${wardId}`}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Presets for Count */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-2">
                Number of Beds to Create
              </label>
              <div className="flex items-center gap-2 mb-2">
                {[5, 10, 15, 20].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      count === c
                        ? 'bg-[#CCA166] text-[#1A1A1C] shadow-sm font-semibold'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                    }`}
                  >
                    {c} Beds
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50 transition-all"
              />
            </div>

            {/* Prefix and Starting Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                  Bed Prefix
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. B-, ICU-"
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#CCA166]/50 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                  Starting Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={startNo}
                  onChange={(e) => setStartNo(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50 transition-all"
                />
              </div>
            </div>

            {/* Zero padding toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/60 select-none">
              <input
                type="checkbox"
                checked={padZeroes}
                onChange={(e) => setPadZeroes(e.target.checked)}
                className="rounded bg-white/10 border-white/20 text-[#CCA166] focus:ring-0 size-4"
              />
              <span>Pad with leading zeroes (e.g. 001, 002)</span>
            </label>

            {/* Live Preview */}
            <div className="bg-[#171719] border border-white/5 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-[#CCA166]" /> Live Preview ({previewBeds.length} beds)
                </span>
                <span className="text-[11px] text-white/30">
                  {previewBeds[0]} → {previewBeds[previewBeds.length - 1]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {previewBeds.map((bedNo, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-[#CCA166]"
                  >
                    {bedNo}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || previewBeds.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-[#CCA166]/15"
              >
                {loading ? (
                  <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Generate {previewBeds.length} Beds
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
