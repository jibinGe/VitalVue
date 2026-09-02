import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Stethoscope, UserCheck, RefreshCw, Plus,
  Filter, Phone, ShieldCheck,
} from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

export default function StaffPage() {
  const { selectedOrgId, organizations, openQuickAdd, triggerRefresh, refreshKey } = useAdmin();

  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'nurses'
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterOrgId, setFilterOrgId] = useState(selectedOrgId ? String(selectedOrgId) : 'all');
  const [filterDeptId, setFilterDeptId] = useState('all');

  // Edit Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Status Toggle State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Sync with global org selection
  useEffect(() => {
    if (selectedOrgId) setFilterOrgId(String(selectedOrgId));
  }, [selectedOrgId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [drRes, nrRes, deptRes] = await Promise.all([
      adminService.listDoctors(),
      adminService.listNurses(),
      adminService.listDepartments(),
    ]);

    if (drRes.success) setDoctors(Array.isArray(drRes.data) ? drRes.data : drRes.data?.items ?? []);
    if (nrRes.success) setNurses(Array.isArray(nrRes.data) ? nrRes.data : nrRes.data?.items ?? []);
    if (deptRes.success) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Lookup maps
  const orgMap = useMemo(() => Object.fromEntries(organizations.map((o) => [o.id, o.name])), [organizations]);
  const deptMap = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);

  // Filtered department options
  const availableDepts = useMemo(() => {
    if (filterOrgId === 'all') return departments;
    return departments.filter((d) => d.organization_id === Number(filterOrgId));
  }, [departments, filterOrgId]);

  // Enrich Doctors
  const enrichedDoctors = useMemo(() => {
    return doctors
      .filter((d) => {
        if (filterOrgId !== 'all' && d.organization_id !== Number(filterOrgId)) return false;
        if (filterDeptId !== 'all' && d.department_id !== Number(filterDeptId)) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        hospital_name: orgMap[d.organization_id] || '—',
        department_name: deptMap[d.department_id] || 'General / Unassigned',
      }));
  }, [doctors, orgMap, deptMap, filterOrgId, filterDeptId]);

  // Enrich Nurses
  const enrichedNurses = useMemo(() => {
    return nurses
      .filter((n) => {
        if (filterOrgId !== 'all' && n.organization_id !== Number(filterOrgId)) return false;
        return true;
      })
      .map((n) => ({
        ...n,
        hospital_name: orgMap[n.organization_id] || '—',
      }));
  }, [nurses, orgMap, filterOrgId]);

  // Table Columns
  const DOCTOR_COLUMNS = [
    { key: 'user_id', label: 'Doctor ID', render: (v) => <span className="font-mono font-bold text-white">{v}</span> },
    { key: 'full_name', label: 'Full Name' },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'department_name', label: 'Department' },
    { key: 'specialization', label: 'Specialization', render: (v) => v || 'General' },
    { key: 'phone_number', label: 'Phone', render: (v) => v || '—' },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  const NURSE_COLUMNS = [
    { key: 'user_id', label: 'Nurse ID', render: (v) => <span className="font-mono font-bold text-white">{v}</span> },
    { key: 'full_name', label: 'Full Name' },
    { key: 'hospital_name', label: 'Hospital' },
    { key: 'license_no', label: 'License No.', render: (v) => <span className="font-mono text-cyan-400">{v}</span> },
    { key: 'phone_number', label: 'Phone', render: (v) => v || '—' },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

  // Actions
  const openAdd = () => {
    openQuickAdd(activeTab === 'doctors' ? 'doctor' : 'nurse', {
      organization_id: filterOrgId !== 'all' ? Number(filterOrgId) : undefined,
      department_id: filterDeptId !== 'all' ? Number(filterDeptId) : undefined,
    });
  };

  const openEdit = (row) => {
    setEditTarget(row);
    if (activeTab === 'doctors') {
      setFormData({
        full_name: row.full_name || '',
        phone_number: row.phone_number || '',
        specialization: row.specialization || '',
        department_id: row.department_id || '',
        organization_id: row.organization_id || '',
      });
    } else {
      setFormData({
        full_name: row.full_name || '',
        phone_number: row.phone_number || '',
        license_no: row.license_no || '',
        organization_id: row.organization_id || '',
      });
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
      name: row.full_name || row.user_id,
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
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Medical Care Team Directory</h1>
            <p className="text-white/40 text-xs">
              Manage doctor credentials, nursing staff, department assignments and rosters
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
            <span>Add {activeTab === 'doctors' ? 'Doctor' : 'Nurse'}</span>
          </button>
        </div>
      </motion.div>

      {/* ── Cascading Filter Bar ─────────────────────────────────────── */}
      <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <Filter className="size-3.5 text-[#CCA166]" /> Scopes:
        </span>

        {/* Hospital Dropdown */}
        <div className="min-w-[200px] flex-1">
          <select
            value={filterOrgId}
            onChange={(e) => {
              setFilterOrgId(e.target.value);
              setFilterDeptId('all');
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

        {/* Department Dropdown (for Doctors) */}
        {activeTab === 'doctors' && (
          <div className="min-w-[200px] flex-1">
            <select
              value={filterDeptId}
              onChange={(e) => setFilterDeptId(e.target.value)}
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
        )}

        {(filterOrgId !== 'all' || filterDeptId !== 'all') && (
          <button
            onClick={() => {
              setFilterOrgId('all');
              setFilterDeptId('all');
            }}
            className="text-xs text-white/40 hover:text-white underline ml-auto px-2"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'doctors', label: 'Doctors', icon: Stethoscope, count: enrichedDoctors.length },
          { id: 'nurses', label: 'Nurses', icon: UserCheck, count: enrichedNurses.length },
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

      {/* ── Table ────────────────────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
      >
        <EntityTable
          columns={activeTab === 'doctors' ? DOCTOR_COLUMNS : NURSE_COLUMNS}
          data={activeTab === 'doctors' ? enrichedDoctors : enrichedNurses}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel={`Add ${activeTab === 'doctors' ? 'Doctor' : 'Nurse'}`}
          searchPlaceholder={`Search ${activeTab} by name, ID, phone...`}
          emptyMessage={`No ${activeTab} found for current filter selection.`}
        />
      </motion.div>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={`Edit ${activeTab === 'doctors' ? 'Doctor' : 'Nurse'} Profile`}
        submitLabel="Save Changes"
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
            {formError}
          </p>
        )}

        <FormField label="Full Name" required>
          <AdminInput
            value={formData.full_name || ''}
            onChange={(e) => setFormData((f) => ({ ...f, full_name: e.target.value }))}
          />
        </FormField>

        <FormField label="Phone Number">
          <AdminInput
            type="tel"
            value={formData.phone_number || ''}
            onChange={(e) => setFormData((f) => ({ ...f, phone_number: e.target.value }))}
          />
        </FormField>

        {activeTab === 'doctors' ? (
          <>
            <FormField label="Specialization">
              <AdminInput
                placeholder="e.g. Cardiologist"
                value={formData.specialization || ''}
                onChange={(e) => setFormData((f) => ({ ...f, specialization: e.target.value }))}
              />
            </FormField>

            <FormField label="Department Assignment">
              <AdminSelect
                value={formData.department_id || ''}
                onChange={(e) => setFormData((f) => ({ ...f, department_id: e.target.value }))}
              >
                <option value="">General / No Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({orgMap[d.organization_id]})
                  </option>
                ))}
              </AdminSelect>
            </FormField>
          </>
        ) : (
          <FormField label="Nursing License No." required>
            <AdminInput
              value={formData.license_no || ''}
              onChange={(e) => setFormData((f) => ({ ...f, license_no: e.target.value }))}
            />
          </FormField>
        )}
      </EntityForm>

      {/* ── Status Confirm Modal ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={handleConfirmToggle}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Staff Member' : 'Activate Staff Member'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
