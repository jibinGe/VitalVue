import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ChevronLeft, GitBranch, Stethoscope, ChevronRight,
  ChevronDown, Plus, Activity, Bed, Radio,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import StatusBadge from '../../components/admin/StatusBadge';

export default function OrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departments');

  // Hierarchy Data — Dept → Station → Ward → Bed
  const [departments, setDepartments] = useState([]);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [stationsByDept, setStationsByDept] = useState({}); // deptId → Station[]
  const [expandedStations, setExpandedStations] = useState(new Set());
  const [wardsByStation, setWardsByStation] = useState({}); // stationId → Ward[]
  const [expandedWards, setExpandedWards] = useState(new Set());
  const [bedsByWard, setBedsByWard] = useState({}); // wardId → Bed[]

  // Doctors Data
  const [doctors, setDoctors] = useState([]);

  // Generic Form State
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState(''); // 'department' | 'station' | 'ward' | 'bed' | 'doctor'
  const [formParentId, setFormParentId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    const res = await adminService.getOrganization(id);
    if (res.success) setOrg(res.data);
    else navigate('/admin/organizations');
    setLoading(false);
  }, [id, navigate]);

  const fetchDepartments = useCallback(async () => {
    const res = await adminService.listDepartments({ organization_id: id });
    if (res.success) setDepartments(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
  }, [id]);

  const fetchDoctors = useCallback(async () => {
    const res = await adminService.listDoctors({ organization_id: id });
    if (res.success) setDoctors(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
  }, [id]);

  useEffect(() => {
    fetchOrganization();
    fetchDepartments();
    fetchDoctors();
  }, [fetchOrganization, fetchDepartments, fetchDoctors]);

  // ─── Accordion toggles ────────────────────────────────────────────────────
  const toggleDept = async (deptId) => {
    const next = new Set(expandedDepts);
    if (next.has(deptId)) { next.delete(deptId); } else {
      next.add(deptId);
      if (!stationsByDept[deptId]) {
        const res = await adminService.listStations({ department_id: deptId });
        if (res.success) setStationsByDept(prev => ({
          ...prev,
          [deptId]: Array.isArray(res.data) ? res.data : res.data?.items ?? [],
        }));
      }
    }
    setExpandedDepts(next);
  };

  const toggleStation = async (stationId) => {
    const next = new Set(expandedStations);
    if (next.has(stationId)) { next.delete(stationId); } else {
      next.add(stationId);
      if (!wardsByStation[stationId]) {
        const res = await adminService.listWards({ station_id: stationId });
        if (res.success) setWardsByStation(prev => ({
          ...prev,
          [stationId]: Array.isArray(res.data) ? res.data : res.data?.items ?? [],
        }));
      }
    }
    setExpandedStations(next);
  };

  const toggleWard = async (wardId) => {
    const next = new Set(expandedWards);
    if (next.has(wardId)) { next.delete(wardId); } else {
      next.add(wardId);
      if (!bedsByWard[wardId]) {
        const res = await adminService.listBeds({ ward_id: wardId });
        if (res.success) setBedsByWard(prev => ({
          ...prev,
          [wardId]: Array.isArray(res.data) ? res.data : res.data?.items ?? [],
        }));
      }
    }
    setExpandedWards(next);
  };

  // ─── Forms ────────────────────────────────────────────────────────────────
  const openForm = (type, parentId = null) => {
    setFormType(type);
    setFormParentId(parentId);
    setFormError('');
    if (type === 'department') setFormData({ name: '' });
    else if (type === 'station') setFormData({ name: '', station_no: '' });
    else if (type === 'ward') setFormData({ name: '' });
    else if (type === 'bed') setFormData({ bed_no: '' });
    else if (type === 'doctor') setFormData({ user_id: '', full_name: '', phone_number: '', specialization: '', password: '' });
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormLoading(true);
    setFormError('');
    let res;

    if (formType === 'department') {
      if (!formData.name?.trim()) { setFormError('Department name is required.'); setFormLoading(false); return; }
      res = await adminService.createDepartment({ ...formData, organization_id: parseInt(id) });
      if (res.success) fetchDepartments();

    } else if (formType === 'station') {
      if (!formData.name?.trim()) { setFormError('Station name is required.'); setFormLoading(false); return; }
      res = await adminService.createStation({ name: formData.name.trim(), station_no: formData.station_no?.trim() || null, department_id: formParentId });
      if (res.success) {
        const sr = await adminService.listStations({ department_id: formParentId });
        if (sr.success) setStationsByDept(prev => ({ ...prev, [formParentId]: Array.isArray(sr.data) ? sr.data : sr.data?.items ?? [] }));
      }

    } else if (formType === 'ward') {
      if (!formData.name?.trim()) { setFormError('Ward name is required.'); setFormLoading(false); return; }
      // formParentId is stationId here
      const stationId = formParentId;
      // Look up department_id from the station
      const station = Object.values(stationsByDept).flat().find(s => s.id === stationId);
      res = await adminService.createWard({ name: formData.name.trim(), department_id: station?.department_id, station_id: stationId });
      if (res.success) {
        const wr = await adminService.listWards({ station_id: stationId });
        if (wr.success) setWardsByStation(prev => ({ ...prev, [stationId]: Array.isArray(wr.data) ? wr.data : wr.data?.items ?? [] }));
      }

    } else if (formType === 'bed') {
      if (!formData.bed_no?.trim()) { setFormError('Bed number is required.'); setFormLoading(false); return; }
      res = await adminService.createBed({ bed_no: formData.bed_no.trim(), ward_id: formParentId });
      if (res.success) {
        const br = await adminService.listBeds({ ward_id: formParentId });
        if (br.success) setBedsByWard(prev => ({ ...prev, [formParentId]: Array.isArray(br.data) ? br.data : br.data?.items ?? [] }));
      }

    } else if (formType === 'doctor') {
      if (!formData.user_id?.trim()) { setFormError('Doctor ID is required.'); setFormLoading(false); return; }
      if (!formData.full_name?.trim()) { setFormError('Full name is required.'); setFormLoading(false); return; }
      if (!formData.password?.trim()) { setFormError('Password is required.'); setFormLoading(false); return; }
      res = await adminService.createDoctor({ ...formData, organization_id: parseInt(id) });
      if (res.success) fetchDoctors();
    }

    setFormLoading(false);
    if (res?.success) setFormOpen(false);
    else if (res) setFormError(res.message);
  };

  const field = (key) => ({
    value: formData[key] || '',
    onChange: (e) => setFormData(f => ({ ...f, [key]: e.target.value })),
  });

  if (loading || !org) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <button onClick={() => navigate('/admin/organizations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit text-sm">
          <ChevronLeft className="size-4" /> Back to Organizations
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <Building2 className="size-6 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <p className="text-white/40 text-sm">{org.city}, {org.state} • {org.country}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'departments' ? 'bg-[#CCA166]/20 text-[#CCA166]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        >
          <GitBranch className="size-4" /> Departments & Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'doctors' ? 'bg-[#CCA166]/20 text-[#CCA166]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        >
          <Stethoscope className="size-4" /> Doctors
        </button>
      </div>

      {/* ── Departments & Hierarchy Tab ─────────────────────────────────── */}
      {activeTab === 'departments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Departments</h2>
            <button
              onClick={() => openForm('department')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
            >
              <Plus className="size-4" /> Add Department
            </button>
          </div>

          <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-2 space-y-2">
            {departments.length === 0 ? (
              <p className="text-white/30 text-sm p-4 text-center">No departments found.</p>
            ) : departments.map(dept => (
              <div key={dept.id} className="border border-white/5 bg-white/5 rounded-xl overflow-hidden">
                {/* Department row */}
                <div
                  onClick={() => toggleDept(dept.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-[#B2884D]/10 text-[#B2884D] rounded-lg">
                      <Activity className="size-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-white/90">{dept.name}</span>
                      {!dept.is_active && <span className="ml-2 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openForm('station', dept.id); }}
                      className="text-xs flex items-center gap-1 text-[#CCA166] hover:text-white bg-[#CCA166]/10 px-2 py-1 rounded-md transition-colors"
                    >
                      <Plus className="size-3" /> Add Station
                    </button>
                    {expandedDepts.has(dept.id) ? <ChevronDown className="size-4 text-white/40" /> : <ChevronRight className="size-4 text-white/40" />}
                  </div>
                </div>

                {/* Stations under dept */}
                <AnimatePresence>
                  {expandedDepts.has(dept.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-[#1A1A1C]/50 pl-8 pr-4 py-3 space-y-2 overflow-hidden"
                    >
                      {!(stationsByDept[dept.id]?.length > 0) ? (
                        <p className="text-white/30 text-xs py-2">No nursing stations configured. Add one above.</p>
                      ) : stationsByDept[dept.id].map(station => (
                        <div key={station.id} className="border border-white/5 bg-[#222225] rounded-lg overflow-hidden">
                          {/* Station row */}
                          <div
                            onClick={() => toggleStation(station.id)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Radio className="size-3.5 text-[#CCA166]/60" />
                              <span className="text-sm font-medium text-white/80">{station.name}</span>
                              {station.station_no && <span className="text-xs text-white/30">({station.station_no})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); openForm('ward', station.id); }}
                                className="text-[11px] flex items-center gap-1 text-blue-400 hover:text-blue-300 bg-blue-400/10 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <Plus className="size-3" /> Add Ward
                              </button>
                              {expandedStations.has(station.id) ? <ChevronDown className="size-3.5 text-white/40" /> : <ChevronRight className="size-3.5 text-white/40" />}
                            </div>
                          </div>

                          {/* Wards under station */}
                          <AnimatePresence>
                            {expandedStations.has(station.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/5 bg-[#1A1A1C]/40 pl-8 pr-4 py-2 space-y-2 overflow-hidden"
                              >
                                {!(wardsByStation[station.id]?.length > 0) ? (
                                  <p className="text-white/30 text-xs py-1.5">No wards in this station.</p>
                                ) : wardsByStation[station.id].map(ward => (
                                  <div key={ward.id} className="border border-white/5 bg-[#262628] rounded-lg overflow-hidden">
                                    {/* Ward row */}
                                    <div
                                      onClick={() => toggleWard(ward.id)}
                                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Bed className="size-3.5 text-white/40" />
                                        <span className="text-xs font-medium text-white/70">{ward.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openForm('bed', ward.id); }}
                                          className="text-[11px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded transition-colors"
                                        >
                                          <Plus className="size-3" /> Add Bed
                                        </button>
                                        {expandedWards.has(ward.id) ? <ChevronDown className="size-3 text-white/30" /> : <ChevronRight className="size-3 text-white/30" />}
                                      </div>
                                    </div>

                                    {/* Beds under ward */}
                                    <AnimatePresence>
                                      {expandedWards.has(ward.id) && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                          className="border-t border-white/5 bg-black/20 p-3 overflow-hidden"
                                        >
                                          {!(bedsByWard[ward.id]?.length > 0) ? (
                                            <p className="text-white/30 text-xs">No beds added.</p>
                                          ) : (
                                            <div className="flex flex-wrap gap-2">
                                              {bedsByWard[ward.id].map(bed => (
                                                <div key={bed.id} className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center gap-2 text-xs text-white/70">
                                                  <span>{bed.bed_no}</span>
                                                  <div className={`size-1.5 rounded-full ${bed.is_occupied ? 'bg-red-400' : 'bg-emerald-400'}`} title={bed.is_occupied ? 'Occupied' : 'Available'} />
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Doctors Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <EntityTable
            columns={[
              { key: 'user_id', label: 'Doctor ID' },
              { key: 'full_name', label: 'Name' },
              { key: 'specialization', label: 'Specialization' },
              { key: 'phone_number', label: 'Phone' },
              { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
            ]}
            data={doctors}
            onAdd={() => openForm('doctor')}
            addLabel="Add Doctor"
            searchPlaceholder="Search doctors..."
            emptyMessage="No doctors assigned to this organization."
          />
        </motion.div>
      )}

      {/* ── Reusable Form Drawer ─────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={`Add ${formType.charAt(0).toUpperCase() + formType.slice(1)}`}
        submitLabel={`Create ${formType.charAt(0).toUpperCase() + formType.slice(1)}`}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 mb-4">{formError}</p>}

        {formType === 'department' && (
          <FormField label="Department Name" required>
            <AdminInput placeholder="e.g. Cardiology" {...field('name')} />
          </FormField>
        )}

        {formType === 'station' && (
          <div className="space-y-4">
            <FormField label="Station Name" required>
              <AdminInput placeholder="e.g. Central Nursing Station" {...field('name')} />
            </FormField>
            <FormField label="Station Number">
              <AdminInput placeholder="e.g. STA-01 (optional)" {...field('station_no')} />
            </FormField>
          </div>
        )}

        {formType === 'ward' && (
          <FormField label="Ward Name" required>
            <AdminInput placeholder="e.g. ICU-A" {...field('name')} />
          </FormField>
        )}

        {formType === 'bed' && (
          <FormField label="Bed Number" required>
            <AdminInput placeholder="e.g. B-101" {...field('bed_no')} />
          </FormField>
        )}

        {formType === 'doctor' && (
          <div className="space-y-4">
            <FormField label="Doctor ID (Login ID)" required>
              <AdminInput placeholder="e.g. DOC-123" {...field('user_id')} />
            </FormField>
            <FormField label="Full Name" required>
              <AdminInput placeholder="e.g. Dr. Jane Smith" {...field('full_name')} />
            </FormField>
            <FormField label="Phone Number" required>
              <AdminInput placeholder="e.g. +1234567890" type="tel" {...field('phone_number')} />
            </FormField>
            <FormField label="Specialization">
              <AdminInput placeholder="e.g. Neurologist" {...field('specialization')} />
            </FormField>
            <FormField label="Password" required>
              <AdminInput type="password" placeholder="Initial login password" autoComplete="new-password" {...field('password')} />
            </FormField>
          </div>
        )}
      </EntityForm>
    </div>
  );
}
