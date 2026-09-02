import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Radio, RefreshCw, Plus, Filter } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

export default function NursingStationsPage() {
  const { selectedOrgId, organizations, openQuickAdd, triggerRefresh, refreshKey } = useAdmin();

  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterOrgId, setFilterOrgId] = useState(selectedOrgId ? String(selectedOrgId) : 'all');
  const [filterDeptId, setFilterDeptId] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({ name: '', station_no: '', department_id: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (selectedOrgId) setFilterOrgId(String(selectedOrgId));
  }, [selectedOrgId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stationRes, deptRes, wardRes] = await Promise.all([
      adminService.listStations(),
      adminService.listDepartments(),
      adminService.listWards(),
    ]);

    if (stationRes.success) setData(Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? []);
    if (deptRes.success) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    if (wardRes.success) setWards(Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const orgMap = useMemo(() => Object.fromEntries(organizations.map((o) => [o.id, o.name])), [organizations]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);

  const availableDepts = useMemo(() => {
    if (filterOrgId === 'all') return departments;
    return departments.filter((d) => d.organization_id === Number(filterOrgId));
  }, [departments, filterOrgId]);

  const enrichedData = useMemo(() => {
    return data
      .filter((s) => {
        const dept = deptMap[s.department_id];
        if (!dept) return false;
        if (filterOrgId !== 'all' && dept.organization_id !== Number(filterOrgId)) return false;
        if (filterDeptId !== 'all' && s.department_id !== Number(filterDeptId)) return false;
        return true;
      })
      .map((s) => {
        const dept = deptMap[s.department_id];
        const orgName = dept ? orgMap[dept.organization_id] : '—';
        const assignedWards = wards.filter((w) => w.station_id === s.id);
        return {
          ...s,
          hospital_name: orgName,
          department_name: dept?.name || '—',
          ward_count: assignedWards.length,
        };
      });
  }, [data, deptMap, orgMap, wards, filterOrgId, filterDeptId]);

  const COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Station Name' },
    { key: 'station_no', label: 'Station No.', render: (v) => v || '—' },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'department_name', label: 'Department' },
    { key: 'ward_count', label: 'Wards', render: (v) => `${v} wards` },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  const openAdd = () => {
    openQuickAdd('station', {
      organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
      department_id: filterDeptId !== 'all' ? Number(filterDeptId) : undefined,
    });
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setFormData({
      name: row.name || '',
      station_no: row.station_no || '',
      department_id: row.department_id || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) { setFormError('Station name is required.'); return; }
    if (!formData.department_id) { setFormError('Please select a department.'); return; }
    setFormLoading(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      station_no: formData.station_no?.trim() || null,
      department_id: Number(formData.department_id),
    };

    const res = editTarget
      ? await adminService.updateStation(editTarget.id, payload)
      : await adminService.createStation(payload);

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
    setConfirmTarget(row);
    setConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    await adminService.setStationStatus(confirmTarget.id, !confirmTarget.is_active);
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
            <Radio className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Nursing Stations</h1>
            <p className="text-white/40 text-xs">
              Manage telemetry monitors and nursing duty stations ({data.length} registered)
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
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 shadow-md shadow-[#CCA166]/15 transition-all"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Add Nursing Station</span>
          </button>
        </div>
      </motion.div>

      {/* ── Cascading Filter Bar ─────────────────────────────────────── */}
      <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="size-3.5 text-[#CCA166]" /> Filter:
        </span>
        <select
          value={filterOrgId}
          onChange={(e) => {
            setFilterOrgId(e.target.value);
            setFilterDeptId('all');
          }}
          className="px-3.5 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50 min-w-[200px]"
        >
          <option value="all">🏥 All Hospitals ({organizations.length})</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>

        <select
          value={filterDeptId}
          onChange={(e) => setFilterDeptId(e.target.value)}
          className="px-3.5 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50 min-w-[200px]"
        >
          <option value="all">🏢 All Departments ({availableDepts.length})</option>
          {availableDepts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {(filterOrgId !== 'all' || filterDeptId !== 'all') && (
          <button
            onClick={() => {
              setFilterOrgId('all');
              setFilterDeptId('all');
            }}
            className="text-xs text-white/40 hover:text-white underline px-2 ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
      >
        <EntityTable
          columns={COLUMNS}
          data={enrichedData}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel="Add Nursing Station"
          searchPlaceholder="Search nursing stations..."
          emptyMessage="No nursing stations found."
        />
      </motion.div>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Nursing Station' : 'Add Nursing Station'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Station'}
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
            {formError}
          </p>
        )}
        <FormField label="Station Name" required>
          <AdminInput
            placeholder="e.g. Central Nursing Station"
            value={formData.name || ''}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Station Number">
          <AdminInput
            placeholder="e.g. NS-01"
            value={formData.station_no || ''}
            onChange={(e) => setFormData((f) => ({ ...f, station_no: e.target.value }))}
          />
        </FormField>
        <FormField label="Department" required>
          <AdminSelect
            value={formData.department_id || ''}
            onChange={(e) => setFormData((f) => ({ ...f, department_id: e.target.value }))}
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({orgMap[d.organization_id]})
              </option>
            ))}
          </AdminSelect>
        </FormField>
      </EntityForm>

      {/* ── Confirm Status Modal ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Station' : 'Activate Station'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
