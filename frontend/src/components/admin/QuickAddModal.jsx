import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, GitBranch, Radio, BedDouble,
  Bed, Users, Stethoscope, DoorOpen, Plus, CheckCircle2,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

const ENTITY_TYPES = [
  { id: 'organization', label: 'Hospital', icon: Building2, color: 'text-amber-400' },
  { id: 'department', label: 'Department', icon: GitBranch, color: 'text-blue-400' },
  { id: 'station', label: 'Nursing Station', icon: Radio, color: 'text-indigo-400' },
  { id: 'ward', label: 'Ward', icon: BedDouble, color: 'text-purple-400' },
  { id: 'bed', label: 'Bed', icon: Bed, color: 'text-emerald-400' },
  { id: 'room', label: 'Room', icon: DoorOpen, color: 'text-teal-400' },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'text-rose-400' },
  { id: 'nurse', label: 'Nurse', icon: Users, color: 'text-cyan-400' },
];

export default function QuickAddModal() {
  const {
    quickAddOpen,
    quickAddType,
    quickAddDefaults,
    closeQuickAdd,
    organizations,
    selectedOrgId,
    triggerRefresh,
    showToast,
  } = useAdmin();

  const [type, setType] = useState(quickAddType || 'department');

  // Cascading selections
  const [orgId, setOrgId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [stationId, setStationId] = useState('');
  const [wardId, setWardId] = useState('');

  // Cascade lists
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [wards, setWards] = useState([]);

  // Form fields
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize from defaults when opened
  useEffect(() => {
    if (quickAddOpen) {
      const activeType = quickAddType || 'department';
      setType(activeType);
      setError('');
      setFormData({});

      const initialOrg = quickAddDefaults.organization_id || selectedOrgId || (organizations[0]?.id ? String(organizations[0].id) : '');
      setOrgId(initialOrg ? String(initialOrg) : '');
      setDeptId(quickAddDefaults.department_id ? String(quickAddDefaults.department_id) : '');
      setStationId(quickAddDefaults.station_id ? String(quickAddDefaults.station_id) : '');
      setWardId(quickAddDefaults.ward_id ? String(quickAddDefaults.ward_id) : '');
    }
  }, [quickAddOpen, quickAddType, quickAddDefaults, selectedOrgId, organizations]);

  // Load departments whenever orgId changes
  useEffect(() => {
    if (!orgId) {
      setDepartments([]);
      return;
    }
    let cancelled = false;
    adminService.listDepartments({ organization_id: Number(orgId) }).then((res) => {
      if (!cancelled && res.success) {
        setDepartments(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
      }
    });
    return () => { cancelled = true; };
  }, [orgId]);

  // Load stations whenever deptId changes
  useEffect(() => {
    if (!deptId) {
      setStations([]);
      return;
    }
    let cancelled = false;
    adminService.listStations({ department_id: Number(deptId) }).then((res) => {
      if (!cancelled && res.success) {
        setStations(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
      }
    });
    return () => { cancelled = true; };
  }, [deptId]);

  // Load wards whenever deptId or stationId changes
  useEffect(() => {
    if (!deptId) {
      setWards([]);
      return;
    }
    let cancelled = false;
    const params = { department_id: Number(deptId) };
    if (stationId) params.station_id = Number(stationId);
    adminService.listWards(params).then((res) => {
      if (!cancelled && res.success) {
        setWards(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
      }
    });
    return () => { cancelled = true; };
  }, [deptId, stationId]);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let res = null;
    try {
      if (type === 'organization') {
        if (!formData.name?.trim()) throw new Error('Hospital name is required.');
        res = await adminService.createOrganization(formData);
      } else if (type === 'department') {
        if (!orgId) throw new Error('Please select a hospital.');
        if (!formData.name?.trim()) throw new Error('Department name is required.');
        res = await adminService.createDepartment({ ...formData, organization_id: Number(orgId) });
      } else if (type === 'station') {
        if (!deptId) throw new Error('Please select a department.');
        if (!formData.name?.trim()) throw new Error('Station name is required.');
        res = await adminService.createStation({
          name: formData.name.trim(),
          station_no: formData.station_no?.trim() || null,
          department_id: Number(deptId),
        });
      } else if (type === 'ward') {
        if (!deptId) throw new Error('Please select a department.');
        if (!formData.name?.trim()) throw new Error('Ward name is required.');
        res = await adminService.createWard({
          name: formData.name.trim(),
          ward_no: formData.ward_no?.trim() || null,
          department_id: Number(deptId),
          station_id: stationId ? Number(stationId) : null,
        });
      } else if (type === 'bed') {
        if (!wardId) throw new Error('Please select a ward.');
        if (!formData.bed_no?.trim()) throw new Error('Bed number is required.');
        res = await adminService.createBed({
          bed_no: formData.bed_no.trim(),
          ward_id: Number(wardId),
        });
      } else if (type === 'room') {
        if (!deptId) throw new Error('Please select a department.');
        if (!formData.room_number?.trim()) throw new Error('Room number is required.');
        res = await adminService.createRoom({
          room_number: formData.room_number.trim(),
          department_id: Number(deptId),
        });
      } else if (type === 'doctor') {
        if (!orgId) throw new Error('Please select a hospital.');
        if (!formData.user_id?.trim()) throw new Error('Doctor Login ID is required.');
        if (!formData.full_name?.trim()) throw new Error('Full Name is required.');
        if (!formData.password?.trim()) throw new Error('Initial password is required.');
        res = await adminService.createDoctor({
          ...formData,
          organization_id: Number(orgId),
          department_id: deptId ? Number(deptId) : null,
        });
      } else if (type === 'nurse') {
        if (!orgId) throw new Error('Please select a hospital.');
        if (!formData.user_id?.trim()) throw new Error('Nurse Login ID is required.');
        if (!formData.full_name?.trim()) throw new Error('Full Name is required.');
        if (!formData.license_no?.trim()) throw new Error('License Number is required.');
        if (!formData.password?.trim()) throw new Error('Initial password is required.');
        res = await adminService.createNurse({
          ...formData,
          organization_id: Number(orgId),
        });
      }

      if (res?.success) {
        showToast(`Created ${type} successfully!`, 'success');
        triggerRefresh();
        closeQuickAdd();
      } else {
        setError(res?.message || 'Failed to create entity.');
      }
    } catch (err) {
      setError(err.message || 'Validation error');
    } finally {
      setLoading(false);
    }
  };

  if (!quickAddOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-[#1C1C1F] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#222225]">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#CCA166]/15 text-[#CCA166] flex items-center justify-center">
                <Plus className="size-4" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Quick Add</h3>
                <p className="text-white/40 text-xs">Create any facility or staff record</p>
              </div>
            </div>
            <button
              onClick={closeQuickAdd}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Type Selector Pills */}
          <div className="p-4 border-b border-white/5 bg-[#18181A]/50 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {ENTITY_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      setError('');
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#CCA166] text-[#1A1A1C] font-semibold shadow-md shadow-[#CCA166]/20'
                        : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                    }`}
                  >
                    <Icon className={`size-3.5 ${isSelected ? 'text-[#1A1A1C]' : t.color}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Cascading Scope Selectors (Shown for all child entities) */}
            {type !== 'organization' && (
              <div className="p-3.5 bg-white/3 border border-white/5 rounded-xl space-y-3">
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  Hierarchy Context
                </p>

                {/* Organization Dropdown */}
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Hospital / Organization *</label>
                  <select
                    value={orgId}
                    onChange={(e) => {
                      setOrgId(e.target.value);
                      setDeptId('');
                      setStationId('');
                      setWardId('');
                    }}
                    className="w-full px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50"
                  >
                    <option value="">Select Hospital...</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Dropdown (for Station, Ward, Bed, Room, Doctor) */}
                {['station', 'ward', 'bed', 'room', 'doctor'].includes(type) && (
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">
                      Department {type === 'doctor' ? '(Optional)' : '*'}
                    </label>
                    <select
                      value={deptId}
                      disabled={!orgId}
                      onChange={(e) => {
                        setDeptId(e.target.value);
                        setStationId('');
                        setWardId('');
                      }}
                      className="w-full px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50 disabled:opacity-40"
                    >
                      <option value="">{orgId ? 'Select Department...' : 'Select hospital first'}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Nursing Station Dropdown (for Ward) */}
                {type === 'ward' && (
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Nursing Station (Optional)</label>
                    <select
                      value={stationId}
                      disabled={!deptId}
                      onChange={(e) => setStationId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50 disabled:opacity-40"
                    >
                      <option value="">None / Unassigned</option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.station_no ? `(${s.station_no})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ward Dropdown (for Bed only — Rooms belong directly to a Department) */}
                {type === 'bed' && (
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Ward *</label>
                    <select
                      value={wardId}
                      disabled={!deptId}
                      onChange={(e) => setWardId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50 disabled:opacity-40"
                    >
                      <option value="">{deptId ? 'Select Ward...' : 'Select department first'}</option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Entity Specific Inputs */}
            {type === 'organization' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Hospital / Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Hospital"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={formData.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={formData.state || ''}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      value={formData.country || ''}
                      onChange={(e) => handleFieldChange('country', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'department' && (
              <div>
                <label className="text-xs text-white/70 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology, Intensive Care, Pediatrics"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                />
              </div>
            )}

            {type === 'station' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Station Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Nursing Station"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Station Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. NS-01"
                    value={formData.station_no || ''}
                    onChange={(e) => handleFieldChange('station_no', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
              </div>
            )}

            {type === 'ward' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/70 block mb-1">Ward Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU-East, General-2"
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Ward Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. W-102"
                    value={formData.ward_no || ''}
                    onChange={(e) => handleFieldChange('ward_no', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
              </div>
            )}

            {type === 'bed' && (
              <div>
                <label className="text-xs text-white/70 block mb-1">Bed Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-101"
                  value={formData.bed_no || ''}
                  onChange={(e) => handleFieldChange('bed_no', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                />
              </div>
            )}

            {type === 'room' && (
              <div>
                <label className="text-xs text-white/70 block mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 204-A, OT-1"
                  value={formData.room_number || ''}
                  onChange={(e) => handleFieldChange('room_number', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                />
              </div>
            )}

            {type === 'doctor' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Doctor Login ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DOC-101"
                      value={formData.user_id || ''}
                      onChange={(e) => handleFieldChange('user_id', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Rajesh Kumar"
                      value={formData.full_name || ''}
                      onChange={(e) => handleFieldChange('full_name', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={formData.phone_number || ''}
                      onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiologist"
                      value={formData.specialization || ''}
                      onChange={(e) => handleFieldChange('specialization', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Temporary login password"
                    value={formData.password || ''}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
              </div>
            )}

            {type === 'nurse' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Nurse Login ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NUR-201"
                      value={formData.user_id || ''}
                      onChange={(e) => handleFieldChange('user_id', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Priya Sharma"
                      value={formData.full_name || ''}
                      onChange={(e) => handleFieldChange('full_name', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 block mb-1">License Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RN-98234"
                      value={formData.license_no || ''}
                      onChange={(e) => handleFieldChange('license_no', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+919876543210"
                      value={formData.phone_number || ''}
                      onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/70 block mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Temporary login password"
                    value={formData.password || ''}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#CCA166]/50"
                  />
                </div>
              </div>
            )}

            {/* Submit / Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={closeQuickAdd}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-[#CCA166]/15"
              >
                {loading ? (
                  <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Create {ENTITY_TYPES.find((t) => t.id === type)?.label}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
