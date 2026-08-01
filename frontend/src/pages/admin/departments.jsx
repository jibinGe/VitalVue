import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, RefreshCw } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Department' },
  { key: 'organization_name', label: 'Organization' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const EMPTY_FORM = { name: '', organization_id: '' };

export default function DepartmentsPage() {
  const [data, setData] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [deptRes, orgRes] = await Promise.all([
      adminService.listDepartments(),
      adminService.listOrganizations(),
    ]);
    if (deptRes.success) setData(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    if (orgRes.success) setOrgs(Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
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
    if (res.success) { setFormOpen(false); fetchData(); }
    else setFormError(res.message);
  };

  const openToggle = (row) => { setConfirmTarget(row); setConfirmOpen(true); };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    await adminService.setDepartmentStatus(confirmTarget.id, !confirmTarget.is_active);
    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmTarget(null);
    fetchData();
  };

  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <GitBranch className="size-5 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Departments</h1>
            <p className="text-white/35 text-sm">Manage clinical departments within organizations</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all" title="Refresh">
          <RefreshCw className="size-4" />
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5">
        <EntityTable
          columns={COLUMNS}
          data={data}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel="Add Department"
          searchPlaceholder="Search departments..."
          emptyMessage="No departments found."
        />
      </motion.div>

      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Department' : 'Add Department'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Department'}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{formError}</p>}
        <FormField label="Department Name" required>
          <AdminInput placeholder="e.g. Cardiology" {...field('name')} />
        </FormField>
        <FormField label="Organization" required>
          <AdminSelect {...field('organization_id')}>
            <option value="">Select organization...</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </AdminSelect>
        </FormField>
      </EntityForm>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Department' : 'Activate Department'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
