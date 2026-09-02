import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, RefreshCw, Plus, Filter, Building2, ChevronRight } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const { selectedOrgId, organizations, openQuickAdd, triggerRefresh, refreshKey } = useAdmin();

  const [data, setData] = useState([]);
  const [wards, setWards] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hospital filter
  const [filterOrgId, setFilterOrgId] = useState(selectedOrgId ? String(selectedOrgId) : 'all');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({ name: '', organization_id: '' });
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
    const [deptRes, wardRes, stationRes] = await Promise.all([
      adminService.listDepartments(),
      adminService.listWards(),
      adminService.listStations(),
    ]);

    if (deptRes.success) setData(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    if (wardRes.success) setWards(Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? []);
    if (stationRes.success) setStations(Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const orgMap = useMemo(() => Object.fromEntries(organizations.map((o) => [o.id, o.name])), [organizations]);

  const enrichedData = useMemo(() => {
    return data
      .filter((d) => (filterOrgId === 'all' ? true : d.organization_id === Number(filterOrgId)))
      .map((d) => {
        const deptWards = wards.filter((w) => w.department_id === d.id);
        const deptStations = stations.filter((s) => s.department_id === d.id);
        return {
          ...d,
          organization_name: orgMap[d.organization_id] ?? '—',
          ward_count: deptWards.length,
          station_count: deptStations.length,
        };
      });
  }, [data, wards, stations, orgMap, filterOrgId]);

  const COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Department Name' },
    { key: 'organization_name', label: 'Hospital' },
    { key: 'station_count', label: 'Stations', render: (v) => `${v} stations` },
    { key: 'ward_count', label: 'Wards', render: (v) => `${v} wards` },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  const openAdd = () => {
    openQuickAdd('department', {
      organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
    });
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setFormData({ name: row.name || '', organization_id: row.organization_id || '' });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) { setFormError('Department name is required.'); return; }
    if (!formData.organization_id) { setFormError('Please select an organization.'); return; }
    setFormLoading(true);
    setFormError('');
    const res = editTarget
      ? await adminService.updateDepartment(editTarget.id, formData)
      : await adminService.createDepartment(formData);
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
    await adminService.setDepartmentStatus(confirmTarget.id, !confirmTarget.is_active);
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
            <GitBranch className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Clinical Departments</h1>
            <p className="text-white/40 text-xs">
              Manage clinical units across hospitals ({data.length} registered)
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
            <span>Add Department</span>
          </button>
        </div>
      </motion.div>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="size-3.5 text-[#CCA166]" /> Filter by Hospital:
        </span>
        <select
          value={filterOrgId}
          onChange={(e) => setFilterOrgId(e.target.value)}
          className="px-3.5 py-1.5 bg-[#252528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#CCA166]/50 min-w-[220px]"
        >
          <option value="all">🏥 All Hospitals ({organizations.length})</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {filterOrgId !== 'all' && (
          <button
            onClick={() => setFilterOrgId('all')}
            className="text-xs text-white/40 hover:text-white underline px-2"
          >
            Clear Filter
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
          onRowClick={(row) => navigate(`/admin/organizations/${row.organization_id}`)}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel="Add Department"
          searchPlaceholder="Search departments..."
          emptyMessage="No departments found."
        />
      </motion.div>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Department' : 'Add Department'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Department'}
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
            {formError}
          </p>
        )}
        <FormField label="Department Name" required>
          <AdminInput
            placeholder="e.g. Cardiology, Intensive Care"
            value={formData.name || ''}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />
        </FormField>
        <FormField label="Hospital" required>
          <AdminSelect
            value={formData.organization_id || ''}
            onChange={(e) => setFormData((f) => ({ ...f, organization_id: e.target.value }))}
          >
            <option value="">Select hospital...</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </AdminSelect>
        </FormField>
      </EntityForm>

      {/* ── Status Modal ──────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Department' : 'Activate Department'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
