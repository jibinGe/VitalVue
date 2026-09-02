import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble, RefreshCw, Layers, Plus, Filter,
  Activity, DoorOpen, Bed, CheckCircle2,
} from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import BatchBedModal from '../../components/admin/BatchBedModal';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

export default function WardsPage() {
  const { selectedOrgId, setSelectedOrgId, organizations, openQuickAdd, triggerRefresh, refreshKey } = useAdmin();

  const [activeTab, setActiveTab] = useState('wards'); // 'wards' | 'beds' | 'rooms'
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterOrgId, setFilterOrgId] = useState(selectedOrgId ? String(selectedOrgId) : 'all');
  const [filterDeptId, setFilterDeptId] = useState('all');
  const [filterWardId, setFilterWardId] = useState('all');

  // Batch Bed Modal
  const [batchModalTarget, setBatchModalTarget] = useState(null); // { wardId, wardName }

  // Single Add / Edit Form
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Status Toggle
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Sync filterOrgId if global selectedOrgId changes
  useEffect(() => {
    if (selectedOrgId) setFilterOrgId(String(selectedOrgId));
  }, [selectedOrgId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [wardRes, bedRes, roomRes, deptRes, stationRes] = await Promise.all([
      adminService.listWards(),
      adminService.listBeds(),
      adminService.listRooms(),
      adminService.listDepartments(),
      adminService.listStations(),
    ]);

    if (wardRes.success) setWards(Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? []);
    if (bedRes.success) setBeds(Array.isArray(bedRes.data) ? bedRes.data : bedRes.data?.items ?? []);
    if (roomRes.success) setRooms(Array.isArray(roomRes.data) ? roomRes.data : roomRes.data?.items ?? []);
    if (deptRes.success) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    if (stationRes.success) setStations(Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Lookup maps for fast enrichment
  const orgMap = useMemo(() => Object.fromEntries(organizations.map((o) => [o.id, o.name])), [organizations]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const stationMap = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s.name])), [stations]);
  const wardMap = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w])), [wards]);

  // Filtered department options based on filterOrgId
  const availableDepts = useMemo(() => {
    if (filterOrgId === 'all') return departments;
    return departments.filter((d) => d.organization_id === Number(filterOrgId));
  }, [departments, filterOrgId]);

  // Filtered ward options based on filterDeptId
  const availableWards = useMemo(() => {
    let list = wards;
    if (filterOrgId !== 'all') {
      const deptIds = new Set(availableDepts.map((d) => d.id));
      list = list.filter((w) => deptIds.has(w.department_id));
    }
    if (filterDeptId !== 'all') {
      list = list.filter((w) => w.department_id === Number(filterDeptId));
    }
    return list;
  }, [wards, availableDepts, filterOrgId, filterDeptId]);

  // Enrich Wards table data
  const enrichedWards = useMemo(() => {
    return wards
      .filter((w) => {
        if (filterOrgId !== 'all') {
          const dept = deptMap[w.department_id];
          if (dept?.organization_id !== Number(filterOrgId)) return false;
        }
        if (filterDeptId !== 'all' && w.department_id !== Number(filterDeptId)) return false;
        return true;
      })
      .map((w) => {
        const dept = deptMap[w.department_id];
        const orgName = dept ? orgMap[dept.organization_id] : '—';
        const bedCount = beds.filter((b) => b.ward_id === w.id).length;
        return {
          ...w,
          hospital_name: orgName,
          department_name: dept?.name || '—',
          station_name: stationMap[w.station_id] || '—',
          bed_count: bedCount,
        };
      });
  }, [wards, deptMap, orgMap, stationMap, beds, filterOrgId, filterDeptId]);

  // Enrich Beds table data
  const enrichedBeds = useMemo(() => {
    return beds
      .filter((b) => {
        const ward = wardMap[b.ward_id];
        if (!ward) return false;
        if (filterOrgId !== 'all') {
          const dept = deptMap[ward.department_id];
          if (dept?.organization_id !== Number(filterOrgId)) return false;
        }
        if (filterDeptId !== 'all' && ward.department_id !== Number(filterDeptId)) return false;
        if (filterWardId !== 'all' && b.ward_id !== Number(filterWardId)) return false;
        return true;
      })
      .map((b) => {
        const ward = wardMap[b.ward_id];
        const dept = ward ? deptMap[ward.department_id] : null;
        const orgName = dept ? orgMap[dept.organization_id] : '—';
        return {
          ...b,
          hospital_name: orgName,
          department_name: dept?.name || '—',
          ward_name: ward?.name || `Ward #${b.ward_id}`,
        };
      });
  }, [beds, wardMap, deptMap, orgMap, filterOrgId, filterDeptId, filterWardId]);

  // Enrich Rooms table data
  const enrichedRooms = useMemo(() => {
    return rooms
      .filter((r) => {
        const ward = wardMap[r.ward_id];
        if (!ward) return false;
        if (filterOrgId !== 'all') {
          const dept = deptMap[ward.department_id];
          if (dept?.organization_id !== Number(filterOrgId)) return false;
        }
        if (filterDeptId !== 'all' && ward.department_id !== Number(filterDeptId)) return false;
        if (filterWardId !== 'all' && r.ward_id !== Number(filterWardId)) return false;
        return true;
      })
      .map((r) => {
        const ward = wardMap[r.ward_id];
        const dept = ward ? deptMap[ward.department_id] : null;
        const orgName = dept ? orgMap[dept.organization_id] : '—';
        return {
          ...r,
          hospital_name: orgName,
          department_name: dept?.name || '—',
          ward_name: ward?.name || `Ward #${r.ward_id}`,
        };
      });
  }, [rooms, wardMap, deptMap, orgMap, filterOrgId, filterDeptId, filterWardId]);

  // ─── Table Columns ────────────────────────────────────────────────────────
  const WARD_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Ward Name' },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'department_name', label: 'Department' },
    { key: 'station_name', label: 'Station' },
    { key: 'bed_count', label: 'Beds', render: (v) => `${v} beds` },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  const BED_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'bed_no', label: 'Bed No.', render: (v) => <span className="font-mono font-bold text-white">{v}</span> },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'department_name', label: 'Department' },
    { key: 'ward_name', label: 'Ward' },
    { key: 'is_occupied', label: 'Occupancy', render: (v) => <StatusBadge status={v ? 'occupied' : 'available'} /> },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  const ROOM_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'room_number', label: 'Room No.', render: (v) => <span className="font-mono font-semibold text-white">{v}</span> },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'ward_name', label: 'Ward' },
    { key: 'is_occupied', label: 'Occupancy', render: (v) => <StatusBadge status={v ? 'occupied' : 'available'} /> },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  // ─── Actions ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    if (activeTab === 'wards') {
      openQuickAdd('ward', {
        organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
        department_id: filterDeptId !== 'all' ? Number(filterDeptId) : undefined,
      });
    } else if (activeTab === 'beds') {
      openQuickAdd('bed', {
        organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
        department_id: filterDeptId !== 'all' ? Number(filterDeptId) : undefined,
        ward_id: filterWardId !== 'all' ? Number(filterWardId) : undefined,
      });
    } else {
      openQuickAdd('room', {
        organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
        department_id: filterDeptId !== 'all' ? Number(filterDeptId) : undefined,
        ward_id: filterWardId !== 'all' ? Number(filterWardId) : undefined,
      });
    }
  };

  const openEdit = (row) => {
    setEditTarget(row);
    if (activeTab === 'wards') {
      setFormData({ name: row.name || '', ward_no: row.ward_no || '', department_id: row.department_id, station_id: row.station_id || '' });
    } else if (activeTab === 'beds') {
      setFormData({ bed_no: row.bed_no || '', ward_id: row.ward_id });
    } else {
      setFormData({ room_number: row.room_number || '', ward_id: row.ward_id, is_occupied: row.is_occupied });
    }
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormLoading(true);
    setFormError('');
    const res = await adminService.updateEntity(activeTab, editTarget.id, formData);
    setFormLoading(false);
    if (res.success) {
      setFormOpen(false);
      fetchData();
      triggerRefresh();
    } else {
      setFormError(res.message);
    }
  };

  const openToggle = (row) => {
    setConfirmTarget({
      entity: activeTab,
      id: row.id,
      name: row.name || row.bed_no || row.room_number || `#${row.id}`,
      is_active: row.is_active,
    });
    setConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    await adminService.setEntityStatus(confirmTarget.entity, confirmTarget.id, !confirmTarget.is_active);
    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmTarget(null);
    fetchData();
    triggerRefresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/10 border border-[#CCA166]/20 rounded-xl text-[#CCA166]">
            <BedDouble className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Facility Bed & Room Directory</h1>
            <p className="text-white/40 text-xs">
              Manage physical assets, wards, beds, and consultation rooms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh"
          >
            <RefreshCw className="size-4" />
          </button>
          {availableWards.length > 0 && (
            <button
              onClick={() =>
                setBatchModalTarget({
                  wardId: filterWardId !== 'all' ? Number(filterWardId) : availableWards[0]?.id,
                  wardName: availableWards[0]?.name,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#CCA166]/15 hover:bg-[#CCA166]/25 text-[#CCA166] border border-[#CCA166]/30 transition-all shadow-sm"
            >
              <Layers className="size-3.5" />
              <span>Batch Generate Beds</span>
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 shadow-md shadow-[#CCA166]/15 transition-all"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>
              Add {activeTab === 'wards' ? 'Ward' : activeTab === 'beds' ? 'Bed' : 'Room'}
            </span>
          </button>
        </div>
      </motion.div>

      {/* ── Cascading Filter Bar ─────────────────────────────────────── */}
      <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Filter className="size-3.5 text-[#CCA166]" /> Scopes:
        </span>

        {/* Hospital Dropdown */}
        <div className="min-w-[180px] flex-1">
          <select
            value={filterOrgId}
            onChange={(e) => {
              setFilterOrgId(e.target.value);
              setFilterDeptId('all');
              setFilterWardId('all');
            }}
            className="w-full px-3 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50"
          >
            <option value="all">🏥 All Hospitals ({organizations.length})</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department Dropdown */}
        <div className="min-w-[180px] flex-1">
          <select
            value={filterDeptId}
            onChange={(e) => {
              setFilterDeptId(e.target.value);
              setFilterWardId('all');
            }}
            className="w-full px-3 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50"
          >
            <option value="all">🏢 All Departments ({availableDepts.length})</option>
            {availableDepts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ward Dropdown (for Beds and Rooms) */}
        {activeTab !== 'wards' && (
          <div className="min-w-[180px] flex-1">
            <select
              value={filterWardId}
              onChange={(e) => setFilterWardId(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50"
            >
              <option value="all">🛏️ All Wards ({availableWards.length})</option>
              {availableWards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(filterOrgId !== 'all' || filterDeptId !== 'all' || filterWardId !== 'all') && (
          <button
            onClick={() => {
              setFilterOrgId('all');
              setFilterDeptId('all');
              setFilterWardId('all');
            }}
            className="text-xs text-white/40 hover:text-white underline ml-auto px-2"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Sub-Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'wards', label: 'Wards', icon: BedDouble, count: enrichedWards.length },
          { id: 'beds', label: 'Physical Beds', icon: Bed, count: enrichedBeds.length },
          { id: 'rooms', label: 'Rooms & Consultation Suites', icon: DoorOpen, count: enrichedRooms.length },
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

      {/* ── Data Table ────────────────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
      >
        <EntityTable
          columns={activeTab === 'wards' ? WARD_COLUMNS : activeTab === 'beds' ? BED_COLUMNS : ROOM_COLUMNS}
          data={activeTab === 'wards' ? enrichedWards : activeTab === 'beds' ? enrichedBeds : enrichedRooms}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel={`Add ${activeTab === 'wards' ? 'Ward' : activeTab === 'beds' ? 'Bed' : 'Room'}`}
          searchPlaceholder={`Search ${activeTab}...`}
          emptyMessage={`No ${activeTab} found for current filter selection.`}
        />
      </motion.div>

      {/* ── Batch Bed Modal ───────────────────────────────────────────── */}
      <BatchBedModal
        isOpen={Boolean(batchModalTarget)}
        onClose={() => setBatchModalTarget(null)}
        wardId={batchModalTarget?.wardId}
        wardName={batchModalTarget?.wardName}
        onSuccess={() => {
          fetchData();
          triggerRefresh();
        }}
      />

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={`Edit ${activeTab.slice(0, -1).toUpperCase() + activeTab.slice(1, -1)}`}
        submitLabel="Save Changes"
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
            {formError}
          </p>
        )}

        {activeTab === 'wards' && (
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

        {activeTab === 'beds' && (
          <FormField label="Bed Number" required>
            <AdminInput
              value={formData.bed_no || ''}
              onChange={(e) => setFormData((f) => ({ ...f, bed_no: e.target.value }))}
            />
          </FormField>
        )}

        {activeTab === 'rooms' && (
          <FormField label="Room Number" required>
            <AdminInput
              value={formData.room_number || ''}
              onChange={(e) => setFormData((f) => ({ ...f, room_number: e.target.value }))}
            />
          </FormField>
        )}
      </EntityForm>

      {/* ── Confirm Status Modal ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={handleConfirmToggle}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Disable Record' : 'Activate Record'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'disable' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Disable' : 'Enable'}
      />
    </div>
  );
}
