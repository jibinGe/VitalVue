import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ChevronLeft, GitBranch, Stethoscope, ChevronRight,
  Plus, Activity, Bed, BedDouble, Radio, Users, DoorOpen, Layers,
  Edit2, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle,
  MapPin, Globe, Sparkles, Filter,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';
import BatchBedModal from '../../components/admin/BatchBedModal';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';

export default function OrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orgId = Number(id);

  const { showToast, triggerRefresh, refreshKey, openQuickAdd } = useAdmin();

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hierarchy'); // 'hierarchy' | 'rooms' | 'staff'

  // Hierarchy Data
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [stations, setStations] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);

  // Batch Bed Modal
  const [batchBedTarget, setBatchBedTarget] = useState(null); // { wardId, wardName }

  // Edit/Create Modal
  const [formOpen, setFormOpen] = useState(false);
  const [formEntity, setFormEntity] = useState('department'); // 'organization' | 'department' | 'station' | 'ward' | 'bed' | 'room'
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Status Toggle Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { entity, id, name, is_active }
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Search in bed grid
  const [bedSearch, setBedSearch] = useState('');

  // ─── Fetch All Data for Organization ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const safe = (p) => Promise.resolve(p).catch((err) => ({ success: false, data: [], message: err?.message }));
    const [
      orgRes,
      deptRes,
      stationRes,
      wardRes,
      bedRes,
      roomRes,
      docRes,
      nurseRes,
    ] = await Promise.all([
      safe(adminService.getOrganization(orgId)),
      safe(adminService.listDepartments({ organization_id: orgId })),
      safe(adminService.listStations()),
      safe(adminService.listWards()),
      safe(adminService.listBeds()),
      safe(adminService.listRooms()),
      safe(adminService.listDoctors({ organization_id: orgId })),
      safe(adminService.listNurses({ organization_id: orgId })),
    ]);

    if (!orgRes.success) {
      navigate('/admin/organizations');
      return;
    }

    const orgData = orgRes.data;
    setOrg(orgData);

    const depts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? [];
    setDepartments(depts);

    // Map department IDs in this org
    const deptIdSet = new Set(depts.map((d) => d.id));

    // Filter stations that belong to this org's departments
    const allStations = Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? [];
    const orgStations = allStations.filter((s) => deptIdSet.has(s.department_id));
    setStations(orgStations);

    // Filter wards that belong to this org's departments
    const allWards = Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? [];
    const orgWards = allWards.filter((w) => deptIdSet.has(w.department_id));
    setWards(orgWards);

    const wardIdSet = new Set(orgWards.map((w) => w.id));

    // Filter beds in this org's wards
    const allBeds = Array.isArray(bedRes.data) ? bedRes.data : bedRes.data?.items ?? [];
    const orgBeds = allBeds.filter((b) => wardIdSet.has(b.ward_id));
    setBeds(orgBeds);

    // Filter rooms in this org's departments (dept-level) or wards (ward-level)
    const allRooms = Array.isArray(roomRes.data) ? roomRes.data : roomRes.data?.items ?? [];
    const orgRooms = allRooms.filter(
      (r) => (r.department_id && deptIdSet.has(r.department_id)) || (r.ward_id && wardIdSet.has(r.ward_id))
    );
    setRooms(orgRooms);

    // Staff
    setDoctors(Array.isArray(docRes.data) ? docRes.data : docRes.data?.items ?? []);
    setNurses(Array.isArray(nurseRes.data) ? nurseRes.data : nurseRes.data?.items ?? []);

    setLoading(false);
  }, [orgId, navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.is_occupied).length;
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    return {
      totalDepts: departments.length,
      totalStations: stations.length,
      totalWards: wards.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      totalStaff: doctors.length + nurses.length,
    };
  }, [departments, stations, wards, beds, doctors, nurses]);

  // ─── Filtered Data by Selected Department ─────────────────────────────────
  const visibleDepts = useMemo(() => {
    if (selectedDeptId === 'all') return departments;
    return departments.filter((d) => d.id === Number(selectedDeptId));
  }, [departments, selectedDeptId]);

  const wardsByDept = useMemo(() => {
    const map = {};
    for (const d of departments) {
      map[d.id] = wards.filter((w) => w.department_id === d.id);
    }
    return map;
  }, [departments, wards]);

  const stationsByDept = useMemo(() => {
    const map = {};
    for (const d of departments) {
      map[d.id] = stations.filter((s) => s.department_id === d.id);
    }
    return map;
  }, [departments, stations]);

  const bedsByWard = useMemo(() => {
    const map = {};
    for (const w of wards) {
      map[w.id] = beds.filter((b) => b.ward_id === w.id);
    }
    return map;
  }, [wards, beds]);

  // ─── Modal Triggers ───────────────────────────────────────────────────────
  const openEditEntity = (entity, item) => {
    setFormEntity(entity);
    setEditTarget(item);
    setFormError('');
    if (entity === 'organization') {
      setFormData({
        name: item.name || '',
        city: item.city || '',
        state: item.state || '',
        country: item.country || '',
        latitude: item.latitude || '',
        longitude: item.longitude || '',
      });
    } else if (entity === 'department') {
      setFormData({ name: item.name || '' });
    } else if (entity === 'station') {
      setFormData({ name: item.name || '', station_no: item.station_no || '', department_id: item.department_id });
    } else if (entity === 'ward') {
      setFormData({ name: item.name || '', ward_no: item.ward_no || '', department_id: item.department_id, station_id: item.station_id || '' });
    } else if (entity === 'bed') {
      setFormData({ bed_no: item.bed_no || '', ward_id: item.ward_id });
    } else if (entity === 'room') {
      setFormData({
        room_number: item.room_number || '',
        ward_id: item.ward_id || null,
        department_id: item.department_id || null,
        is_occupied: item.is_occupied ?? false,
      });
    }
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormLoading(true);
    setFormError('');

    let res;
    if (editTarget) {
      res = await adminService.updateEntity(
        formEntity === 'organization' ? 'organizations' : `${formEntity}s`,
        editTarget.id,
        formData
      );
    }
    setFormLoading(false);

    if (res?.success) {
      showToast(`Updated ${formEntity} successfully!`);
      setFormOpen(false);
      fetchAll();
      triggerRefresh();
    } else {
      setFormError(res?.message || 'Failed to save changes.');
    }
  };

  const openToggleStatus = (entity, item) => {
    setConfirmTarget({
      entity,
      id: item.id,
      name: item.name || item.bed_no || item.room_number || item.full_name || `#${item.id}`,
      is_active: item.is_active,
    });
    setConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const entityPlural =
      confirmTarget.entity.endsWith('s') ? confirmTarget.entity : `${confirmTarget.entity}s`;

    const res = await adminService.setEntityStatus(
      entityPlural,
      confirmTarget.id,
      !confirmTarget.is_active
    );
    setConfirmLoading(false);
    setConfirmOpen(false);

    if (res.success) {
      showToast(`${confirmTarget.is_active ? 'Disabled' : 'Activated'} ${confirmTarget.name}`);
      fetchAll();
      triggerRefresh();
    } else {
      showToast(res.message || 'Action failed', 'error');
    }
  };

  if (loading || !org) {
    return (
      <div className="flex items-center justify-center py-28">
        <div className="size-10 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Top Bar / Header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <button
          onClick={() => navigate('/admin/organizations')}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors w-fit text-xs font-medium"
        >
          <ChevronLeft className="size-4" /> Back to Hospital List
        </button>

        <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
          {/* Subtle gold accent glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#CCA166]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-[#B2884D]/20 to-[#CCA166]/20 border border-[#CCA166]/30 flex items-center justify-center text-[#CCA166] shadow-lg shadow-[#CCA166]/10 shrink-0">
                <Building2 className="size-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{org.name}</h1>
                  <StatusBadge status={org.is_active} />
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-[#CCA166]" />
                    {org.city ? `${org.city}, ` : ''}{org.state ? `${org.state}, ` : ''}{org.country}
                  </span>
                  {org.latitude && org.longitude && (
                    <span className="flex items-center gap-1 font-mono text-white/30">
                      <Globe className="size-3 text-white/30" />
                      {org.latitude.toFixed(4)}, {org.longitude.toFixed(4)}
                    </span>
                  )}
                  <span className="text-white/20">•</span>
                  <span className="text-white/40">Hospital ID #{org.id}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => openEditEntity('organization', org)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold transition-all"
              >
                <Edit2 className="size-3.5" /> Edit Hospital Info
              </button>
              <button
                onClick={() => openToggleStatus('organizations', org)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  org.is_active
                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {org.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                {org.is_active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => openQuickAdd('department', { organization_id: orgId })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 shadow-md shadow-[#CCA166]/20 transition-all"
              >
                <Plus className="size-3.5 stroke-[2.5]" /> Add Department
              </button>
            </div>
          </div>

          {/* KPI Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/5">
            <div className="p-3 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Departments</p>
              <p className="text-xl font-bold text-white mt-0.5">{stats.totalDepts}</p>
            </div>
            <div className="p-3 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Wards / Stations</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {stats.totalWards} <span className="text-xs text-white/30 font-normal">/ {stats.totalStations}</span>
              </p>
            </div>
            <div className="p-3 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Total Beds</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-xl font-bold text-[#CCA166]">{stats.totalBeds}</p>
                <span className="text-xs text-emerald-400 font-medium">({stats.availableBeds} free)</span>
              </div>
            </div>
            <div className="p-3 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Occupancy Rate</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#CCA166] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.occupancyRate)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white">{stats.occupancyRate}%</span>
              </div>
            </div>
            <div className="p-3 bg-white/3 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Assigned Staff</p>
              <p className="text-xl font-bold text-white mt-0.5">{stats.totalStaff}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── View Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'hierarchy', label: 'Departments & Beds', icon: GitBranch, count: stats.totalDepts },
            { id: 'rooms', label: 'Rooms & OT', icon: DoorOpen, count: rooms.length },
            { id: 'staff', label: 'Medical Staff', icon: Stethoscope, count: stats.totalStaff },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#CCA166] text-[#1A1A1C] shadow-md shadow-[#CCA166]/20 font-bold'
                    : 'bg-[#1E1E21] text-white/60 hover:text-white border border-white/5 hover:border-white/10'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? 'bg-[#1A1A1C]/20 text-[#1A1A1C]' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action button corresponding to tab */}
        {activeTab === 'hierarchy' && (
          <button
            onClick={() => openQuickAdd('department', { organization_id: orgId })}
            className="flex items-center gap-1.5 text-xs text-[#CCA166] hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg bg-[#CCA166]/10 hover:bg-[#CCA166]/20 border border-[#CCA166]/20"
          >
            <Plus className="size-3.5" /> Add Department
          </button>
        )}
        {activeTab === 'rooms' && (
          <button
            onClick={() => openQuickAdd('room', { organization_id: orgId })}
            className="flex items-center gap-1.5 text-xs text-[#CCA166] hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg bg-[#CCA166]/10 hover:bg-[#CCA166]/20 border border-[#CCA166]/20"
          >
            <Plus className="size-3.5" /> Add Room
          </button>
        )}
        {activeTab === 'staff' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openQuickAdd('doctor', { organization_id: orgId })}
              className="flex items-center gap-1.5 text-xs text-[#CCA166] hover:text-white font-medium px-3 py-1.5 rounded-lg bg-[#CCA166]/10 hover:bg-[#CCA166]/20 border border-[#CCA166]/20 transition-colors"
            >
              <Plus className="size-3.5" /> Add Doctor
            </button>
            <button
              onClick={() => openQuickAdd('nurse', { organization_id: orgId })}
              className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Plus className="size-3.5" /> Add Nurse
            </button>
          </div>
        )}
      </div>

      {/* ── TAB 1: Clinical Departments, Wards & Beds Hierarchy ─────────── */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Department Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-xs text-white/40 font-medium whitespace-nowrap mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Filter Dept:
            </span>
            <button
              onClick={() => setSelectedDeptId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedDeptId === 'all'
                  ? 'bg-white/20 text-white font-semibold'
                  : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              All Departments ({departments.length})
            </button>
            {departments.map((dept) => {
              const count = wardsByDept[dept.id]?.length || 0;
              const isSelected = selectedDeptId === String(dept.id);
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(String(dept.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#CCA166]/20 text-[#CCA166] border border-[#CCA166]/30 font-semibold'
                      : 'bg-white/5 text-white/50 hover:text-white border border-transparent'
                  }`}
                >
                  <span>{dept.name}</span>
                  <span className="text-[10px] opacity-60">({count} wards)</span>
                </button>
              );
            })}
          </div>

          {/* Departments Grid */}
          {visibleDepts.length === 0 ? (
            <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-12 text-center">
              <GitBranch className="size-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-base">No Clinical Departments</h3>
              <p className="text-white/40 text-xs mt-1 mb-4">
                Add your first department (e.g. Cardiology, ICU, Pediatrics) to begin building the facility structure.
              </p>
              <button
                onClick={() => openQuickAdd('department', { organization_id: orgId })}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-[#CCA166] hover:opacity-90 transition-all"
              >
                Create Department
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleDepts.map((dept) => {
                const deptWards = wardsByDept[dept.id] || [];
                const deptStations = stationsByDept[dept.id] || [];

                return (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5 shadow-lg space-y-5"
                  >
                    {/* Department Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                          <GitBranch className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white">{dept.name}</h2>
                            <StatusBadge status={dept.is_active} />
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">
                            {deptStations.length} Nursing Station{deptStations.length === 1 ? '' : 's'} • {deptWards.length} Ward{deptWards.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditEntity('department', dept)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-xs"
                          title="Edit Department Name"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => openToggleStatus('departments', dept)}
                          className={`p-2 rounded-lg text-xs transition-all ${
                            dept.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                              : 'bg-white/5 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400'
                          }`}
                          title="Toggle Active Status"
                        >
                          {dept.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                        </button>
                        <button
                          onClick={() => openQuickAdd('station', { organization_id: orgId, department_id: dept.id })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all font-medium"
                        >
                          <Plus className="size-3" /> Station
                        </button>
                        <button
                          onClick={() => openQuickAdd('ward', { organization_id: orgId, department_id: dept.id })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#CCA166]/10 hover:bg-[#CCA166]/20 text-[#CCA166] border border-[#CCA166]/20 transition-all font-semibold"
                        >
                          <Plus className="size-3" /> Add Ward
                        </button>
                      </div>
                    </div>

                    {/* Wards Container */}
                    {deptWards.length === 0 ? (
                      <div className="bg-[#171719] border border-dashed border-white/10 rounded-xl p-6 text-center">
                        <p className="text-white/40 text-xs">No wards created in this department yet.</p>
                        <button
                          onClick={() => openQuickAdd('ward', { organization_id: orgId, department_id: dept.id })}
                          className="mt-2 text-xs text-[#CCA166] hover:underline font-medium"
                        >
                          + Add a Ward to {dept.name}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {deptWards.map((ward) => {
                          const wardBeds = bedsByWard[ward.id] || [];
                          const assignedStation = stations.find((s) => s.id === ward.station_id);

                          return (
                            <div
                              key={ward.id}
                              className="bg-[#19191C] border border-white/5 rounded-xl p-4 space-y-3.5"
                            >
                              {/* Ward Top Bar */}
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    <BedDouble className="size-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white text-sm">{ward.name}</span>
                                      {ward.ward_no && (
                                        <span className="text-xs text-white/30 font-mono">({ward.ward_no})</span>
                                      )}
                                      <StatusBadge status={ward.is_active} />
                                    </div>
                                    {assignedStation && (
                                      <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                                        <Radio className="size-3 text-indigo-400" />
                                        Station: {assignedStation.name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Ward Actions */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditEntity('ward', ward)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-xs"
                                    title="Edit Ward"
                                  >
                                    <Edit2 className="size-3" />
                                  </button>
                                  <button
                                    onClick={() => openToggleStatus('wards', ward)}
                                    className={`p-1.5 rounded-lg text-xs transition-all ${
                                      ward.is_active
                                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                                        : 'bg-white/5 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400'
                                    }`}
                                    title="Toggle Status"
                                  >
                                    {ward.is_active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => openQuickAdd('bed', { organization_id: orgId, department_id: dept.id, ward_id: ward.id })}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium transition-all"
                                  >
                                    <Plus className="size-3" /> Bed
                                  </button>
                                  <button
                                    onClick={() => setBatchBedTarget({ wardId: ward.id, wardName: ward.name })}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[#CCA166]/15 hover:bg-[#CCA166]/25 text-[#CCA166] border border-[#CCA166]/30 font-semibold transition-all shadow-sm"
                                  >
                                    <Layers className="size-3" /> Batch Beds
                                  </button>
                                </div>
                              </div>

                              {/* Interactive Bed Grid */}
                              <div className="pt-2 border-t border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                                    Beds ({wardBeds.length})
                                  </span>
                                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                                    <span className="flex items-center gap-1">
                                      <span className="size-2 rounded-full bg-emerald-400" /> Free ({wardBeds.filter(b => !b.is_occupied).length})
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="size-2 rounded-full bg-rose-400" /> Occupied ({wardBeds.filter(b => b.is_occupied).length})
                                    </span>
                                  </div>
                                </div>

                                {wardBeds.length === 0 ? (
                                  <div className="bg-[#141416] p-4 rounded-lg text-center border border-white/5">
                                    <p className="text-white/30 text-xs">No beds in this ward yet.</p>
                                    <button
                                      onClick={() => setBatchBedTarget({ wardId: ward.id, wardName: ward.name })}
                                      className="mt-1 text-xs text-[#CCA166] hover:underline font-semibold"
                                    >
                                      ⚡ Quick Generate 10 Beds
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                    {wardBeds.map((bed) => {
                                      const isOccupied = bed.is_occupied;
                                      return (
                                        <div
                                          key={bed.id}
                                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between group relative ${
                                            isOccupied
                                              ? 'bg-rose-500/10 border-rose-500/25 text-white'
                                              : bed.is_active
                                              ? 'bg-white/3 hover:bg-white/5 border-white/10 text-white'
                                              : 'bg-white/1 border-white/5 text-white/30 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1 mb-1">
                                            <span className="text-xs font-bold font-mono truncate">{bed.bed_no}</span>
                                            <span
                                              className={`size-2 rounded-full shrink-0 ${
                                                isOccupied ? 'bg-rose-400 animate-pulse' : bed.is_active ? 'bg-emerald-400' : 'bg-white/20'
                                              }`}
                                              title={isOccupied ? 'Occupied' : bed.is_active ? 'Available' : 'Disabled'}
                                            />
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-white/40">
                                            <span>{isOccupied ? 'Occupied' : 'Free'}</span>
                                            {/* Hover Actions */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                              <button
                                                onClick={() => openEditEntity('bed', bed)}
                                                className="p-1 hover:text-[#CCA166] text-white/50"
                                                title="Edit Bed Number"
                                              >
                                                <Edit2 className="size-2.5" />
                                              </button>
                                              <button
                                                onClick={() => openToggleStatus('beds', bed)}
                                                className="p-1 hover:text-red-400 text-white/50"
                                                title="Toggle Bed Active"
                                              >
                                                <ToggleRight className="size-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Physical Rooms & Operation Theatres ─────────────────── */}
      {activeTab === 'rooms' && (
        <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Physical Rooms & Consultation Suites</h2>
            <button
              onClick={() => openQuickAdd('room', { organization_id: orgId })}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#CCA166] text-[#1A1A1C] font-semibold hover:opacity-90 transition-all flex items-center gap-1"
            >
              <Plus className="size-3" /> Add Room
            </button>
          </div>

          {rooms.length === 0 ? (
            <p className="text-white/40 text-xs py-8 text-center">No rooms registered for this facility.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const ward = wards.find((w) => w.id === room.ward_id);
                const dept = departments.find((d) => d.id === (room.department_id || ward?.department_id));
                const subtitle = dept
                  ? (ward ? `${dept.name} • ${ward.name}` : dept.name)
                  : (ward ? ward.name : 'Facility Room');
                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                        <DoorOpen className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Room {room.room_number}</h4>
                        <p className="text-xs text-white/40">{subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={room.is_occupied ? 'occupied' : 'available'} />
                      <button
                        onClick={() => openEditEntity('room', room)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5"
                        title="Edit Room"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => openToggleStatus('rooms', room)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-white/5"
                        title="Toggle Status"
                      >
                        {room.is_active ? <ToggleRight className="size-4 text-emerald-400" /> : <ToggleLeft className="size-4 text-white/30" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Medical Staff (Doctors & Nurses) ─────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Doctors Section */}
          <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="size-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Doctors ({doctors.length})</h3>
              </div>
              <button
                onClick={() => openQuickAdd('doctor', { organization_id: orgId })}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 font-semibold transition-all flex items-center gap-1"
              >
                <Plus className="size-3" /> Add Doctor
              </button>
            </div>

            {doctors.length === 0 ? (
              <p className="text-white/40 text-xs py-4 text-center">No doctors registered under this hospital.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {doctors.map((doc) => {
                  const dept = departments.find((d) => d.id === doc.department_id);
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{doc.full_name}</h4>
                          <p className="text-xs text-white/40 font-mono">ID: {doc.user_id}</p>
                          <p className="text-xs text-[#CCA166] mt-1">{doc.specialization || 'General Physician'}</p>
                        </div>
                        <StatusBadge status={doc.is_active} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
                        <span>{dept ? dept.name : 'All Depts'}</span>
                        <span>{doc.phone_number || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nurses Section */}
          <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="size-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Nurses ({nurses.length})</h3>
              </div>
              <button
                onClick={() => openQuickAdd('nurse', { organization_id: orgId })}
                className="px-3 py-1.5 rounded-lg text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 font-semibold transition-all flex items-center gap-1"
              >
                <Plus className="size-3" /> Add Nurse
              </button>
            </div>

            {nurses.length === 0 ? (
              <p className="text-white/40 text-xs py-4 text-center">No nurses registered under this hospital.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nurses.map((nurse) => (
                  <div
                    key={nurse.id}
                    className="p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{nurse.full_name}</h4>
                        <p className="text-xs text-white/40 font-mono">ID: {nurse.user_id}</p>
                        <p className="text-xs text-cyan-400 mt-1">License: {nurse.license_no}</p>
                      </div>
                      <StatusBadge status={nurse.is_active} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/5">
                      <span>Nurse Roster</span>
                      <span>{nurse.phone_number || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* Batch Bed Generator */}
      <BatchBedModal
        isOpen={Boolean(batchBedTarget)}
        onClose={() => setBatchBedTarget(null)}
        wardId={batchBedTarget?.wardId}
        wardName={batchBedTarget?.wardName}
        onSuccess={(count) => {
          showToast(`Generated ${count} beds successfully!`, 'success');
          fetchAll();
          triggerRefresh();
        }}
      />

      {/* Edit Entity Modal */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={`Edit ${formEntity.charAt(0).toUpperCase() + formEntity.slice(1)}`}
        submitLabel="Save Changes"
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
            {formError}
          </p>
        )}

        {formEntity === 'organization' && (
          <div className="space-y-4">
            <FormField label="Hospital Name" required>
              <AdminInput
                value={formData.name || ''}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="City">
                <AdminInput
                  value={formData.city || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))}
                />
              </FormField>
              <FormField label="State">
                <AdminInput
                  value={formData.state || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, state: e.target.value }))}
                />
              </FormField>
              <FormField label="Country">
                <AdminInput
                  value={formData.country || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, country: e.target.value }))}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Latitude">
                <AdminInput
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, latitude: e.target.value }))}
                />
              </FormField>
              <FormField label="Longitude">
                <AdminInput
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData((f) => ({ ...f, longitude: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
        )}

        {formEntity === 'department' && (
          <FormField label="Department Name" required>
            <AdminInput
              value={formData.name || ''}
              onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
        )}

        {formEntity === 'ward' && (
          <div className="space-y-3">
            <FormField label="Ward Name" required>
              <AdminInput
                value={formData.name || ''}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Ward Number">
              <AdminInput
                value={formData.ward_no || ''}
                onChange={(e) => setFormData((f) => ({ ...f, ward_no: e.target.value }))}
              />
            </FormField>
          </div>
        )}

        {formEntity === 'bed' && (
          <FormField label="Bed Number" required>
            <AdminInput
              value={formData.bed_no || ''}
              onChange={(e) => setFormData((f) => ({ ...f, bed_no: e.target.value }))}
            />
          </FormField>
        )}

        {formEntity === 'room' && (
          <div className="space-y-3">
            <FormField label="Room Number" required>
              <AdminInput
                value={formData.room_number || ''}
                onChange={(e) => setFormData((f) => ({ ...f, room_number: e.target.value }))}
              />
            </FormField>
            <FormField label="Department">
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData((f) => ({ ...f, department_id: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#CCA166]/50"
              >
                <option value="">None / Direct</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </EntityForm>

      {/* Confirm Status Toggle */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Disable Record' : 'Enable Record'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'disable' : 'enable'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Disable' : 'Enable'}
      />
    </div>
  );
}
