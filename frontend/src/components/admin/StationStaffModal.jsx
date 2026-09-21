import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Stethoscope, Plus, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';

const NURSE_TYPE_LABELS = { head: 'Head Nurse', team_leader: 'Team Leader', nurse: 'Nurse' };

function RosterSection({
  icon: Icon,
  title,
  accentClass,
  pickerLabel,
  options,
  optionLabel,
  assigned,
  rowLabel,
  rowBadge,
  onAdd,
  onRemove,
  busy,
}) {
  const [selected, setSelected] = useState('');

  const handleAdd = () => {
    if (!selected) return;
    onAdd(Number(selected));
    setSelected('');
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className={`size-3.5 ${accentClass}`} /> {title}
      </p>

      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={busy || options.length === 0}
          className="flex-1 px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50 disabled:opacity-40"
        >
          <option value="" className="bg-[#252528] text-white">
            {options.length === 0 ? `No available ${pickerLabel}` : `Select ${pickerLabel} to add...`}
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#252528] text-white">
              {optionLabel(o)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !selected}
          className="p-2 rounded-lg bg-[#CCA166]/15 border border-[#CCA166]/30 text-[#CCA166] hover:bg-[#CCA166]/25 disabled:opacity-30 transition-all"
          title={`Add ${pickerLabel}`}
        >
          <Plus className="size-4" />
        </button>
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-white/30 py-1">None assigned yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {assigned.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80"
            >
              {rowLabel(p)}
              {rowBadge(p) && <span className="text-[10px] text-white/40">· {rowBadge(p)}</span>}
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                disabled={busy}
                className="p-0.5 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-30"
                title="Remove"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StationStaffModal({ isOpen, onClose, station, doctors = [], nurses = [] }) {
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [assignedNurses, setAssignedNurses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetchRosters = useCallback(async () => {
    if (!station) return;
    setLoading(true);
    setError('');
    const [docRes, nurseRes] = await Promise.all([
      adminService.listStationDoctors(station.id),
      adminService.listStationNurses(station.id),
    ]);
    if (docRes.success) setAssignedDoctors(docRes.data);
    if (nurseRes.success) setAssignedNurses(nurseRes.data);
    if (!docRes.success || !nurseRes.success) setError('Failed to load current roster.');
    setLoading(false);
  }, [station]);

  useEffect(() => {
    if (isOpen && station) fetchRosters();
  }, [isOpen, station, fetchRosters]);

  const availableDoctors = useMemo(() => {
    const assignedIds = new Set(assignedDoctors.map((d) => d.id));
    return doctors.filter(
      (d) => d.organization_id === station?.organization_id && d.doctor_type === 'duty' && !assignedIds.has(d.id)
    );
  }, [doctors, assignedDoctors, station]);

  const availableNurses = useMemo(() => {
    const assignedIds = new Set(assignedNurses.map((n) => n.id));
    return nurses.filter((n) => n.organization_id === station?.organization_id && !assignedIds.has(n.id));
  }, [nurses, assignedNurses, station]);

  const handleAddDoctor = async (doctorId) => {
    setBusy(true);
    setError('');
    const res = await adminService.assignStationDoctor(station.id, doctorId);
    setBusy(false);
    if (res.success) {
      const doc = doctors.find((d) => d.id === doctorId);
      if (doc) setAssignedDoctors((prev) => [...prev, doc]);
    } else {
      setError(res.message || 'Failed to assign doctor.');
    }
  };

  const handleRemoveDoctor = async (doctorId) => {
    setBusy(true);
    setError('');
    const res = await adminService.unassignStationDoctor(station.id, doctorId);
    setBusy(false);
    if (res.success) {
      setAssignedDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    } else {
      setError(res.message || 'Failed to remove doctor.');
    }
  };

  const handleAddNurse = async (nurseId) => {
    setBusy(true);
    setError('');
    const res = await adminService.assignStationNurse(station.id, nurseId);
    setBusy(false);
    if (res.success) {
      const nurse = nurses.find((n) => n.id === nurseId);
      if (nurse) setAssignedNurses((prev) => [...prev, nurse]);
    } else {
      setError(res.message || 'Failed to assign nurse.');
    }
  };

  const handleRemoveNurse = async (nurseId) => {
    setBusy(true);
    setError('');
    const res = await adminService.unassignStationNurse(station.id, nurseId);
    setBusy(false);
    if (res.success) {
      setAssignedNurses((prev) => prev.filter((n) => n.id !== nurseId));
    } else {
      setError(res.message || 'Failed to remove nurse.');
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
              <div className="p-2 bg-cyan-500/15 border border-cyan-500/25 rounded-xl text-cyan-400">
                <Users className="size-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Assign Station Staff</h3>
                <p className="text-white/40 text-xs mt-0.5">
                  <span className="text-[#CCA166] font-medium">{station?.name}</span>
                  {station?.station_no ? ` (${station.station_no})` : ''}
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

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="size-8 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <RosterSection
                  icon={Stethoscope}
                  title="Duty Doctors"
                  accentClass="text-rose-400"
                  pickerLabel="duty doctor"
                  options={availableDoctors}
                  optionLabel={(d) => `${d.full_name} (${d.user_id})`}
                  assigned={assignedDoctors}
                  rowLabel={(d) => d.full_name}
                  rowBadge={(d) => d.user_id}
                  onAdd={handleAddDoctor}
                  onRemove={handleRemoveDoctor}
                  busy={busy}
                />

                <RosterSection
                  icon={Users}
                  title="Nursing Staff"
                  accentClass="text-cyan-400"
                  pickerLabel="nurse"
                  options={availableNurses}
                  optionLabel={(n) => `${n.full_name} — ${NURSE_TYPE_LABELS[n.nurse_type] || 'Nurse'}`}
                  assigned={assignedNurses}
                  rowLabel={(n) => n.full_name}
                  rowBadge={(n) => NURSE_TYPE_LABELS[n.nurse_type] || 'Nurse'}
                  onAdd={handleAddNurse}
                  onRemove={handleRemoveNurse}
                  busy={busy}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
