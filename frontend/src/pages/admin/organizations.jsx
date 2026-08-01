import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, RefreshCw } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Organization' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const EMPTY_FORM = { name: '', country: '', state: '', city: '', latitude: '', longitude: '' };

export default function OrganizationsPage() {
  const [data, setData] = useState([]);
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
    const res = await adminService.listOrganizations();
    if (res.success) {
      setData(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
    }
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
    setFormData({ name: row.name || '', country: row.country || '', state: row.state || '', city: row.city || '', latitude: row.latitude || '', longitude: row.longitude || '' });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) { setFormError('Organization name is required.'); return; }
    setFormLoading(true);
    setFormError('');
    const res = editTarget
      ? await adminService.updateOrganization(editTarget.id, formData)
      : await adminService.createOrganization(formData);
    setFormLoading(false);
    if (res.success) {
      setFormOpen(false);
      fetchData();
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
    const newStatus = !confirmTarget.is_active;
    await adminService.setOrganizationStatus(confirmTarget.id, newStatus);
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <Building2 className="size-5 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Organizations</h1>
            <p className="text-white/35 text-sm">Manage hospitals, clinics and healthcare networks</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          title="Refresh"
        >
          <RefreshCw className="size-4" />
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
      >
        <EntityTable
          columns={COLUMNS}
          data={data}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel="Add Organization"
          searchPlaceholder="Search organizations..."
          emptyMessage="No organizations found. Add one to get started."
        />
      </motion.div>

      {/* Form Drawer */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Organization' : 'Add Organization'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Organization'}
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{formError}</p>
        )}
        <FormField label="Organization Name" required>
          <AdminInput placeholder="e.g. City General Hospital" {...field('name')} />
        </FormField>
        <FormField label="Country">
          <AdminInput placeholder="e.g. India" {...field('country')} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="State">
            <AdminInput placeholder="e.g. Karnataka" {...field('state')} />
          </FormField>
          <FormField label="City">
            <AdminInput placeholder="e.g. Bangalore" {...field('city')} />
          </FormField>
          <FormField label="Latitude">
            <AdminInput type="number" step="any" placeholder="e.g. 12.9716" {...field('latitude')} />
          </FormField>
          <FormField label="Longitude">
            <AdminInput type="number" step="any" placeholder="e.g. 77.5946" {...field('longitude')} />
          </FormField>
        </div>
      </EntityForm>

      {/* Confirm status toggle */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Organization' : 'Activate Organization'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
