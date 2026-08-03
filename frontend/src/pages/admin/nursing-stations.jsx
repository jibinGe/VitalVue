import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Radio, RefreshCw } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Station Name' },
  { key: 'station_no', label: 'Station No.', render: (v) => v || '—' },
  { key: 'department_name', label: 'Department' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const EMPTY_FORM = { name: '', station_no: '', department_id: '' };

export default function NursingStationsPage() {
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
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
    const [stationRes, deptRes] = await Promise.all([
      adminService.listStations(),
      adminService.listDepartments(),
    ]);

    let stationItems = [];
    if (stationRes.success) {
      stationItems = Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? [];
    }

    let deptItems = [];
    if (deptRes.success) {
      deptItems = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? [];
      setDepartments(deptItems);
    }

    // Enrich stations with department_name for the table column
    const deptMap = Object.fromEntries(deptItems.map((d) => [d.id, d.name]));
    const enriched = stationItems.map((s) => ({
      ...s,
      department_name: deptMap[s.department_id] ?? '—',
    }));

    setData(enriched);
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
    if (res.success) { setFormOpen(false); fetchData(); }
    else setFormError(res.message);
  };

  const openToggle = (row) => { setConfirmTarget(row); setConfirmOpen(true); };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    await adminService.setStationStatus(confirmTarget.id, !confirmTarget.is_active);
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
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <Radio className="size-5 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Nursing Stations</h1>
            <p className="text-white/35 text-sm">Manage nursing stations within departments</p>
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5">
        <EntityTable
          columns={COLUMNS}
          data={data}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel="Add Nursing Station"
          searchPlaceholder="Search nursing stations..."
          emptyMessage="No nursing stations found."
        />
      </motion.div>

      {/* Form */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Nursing Station' : 'Add Nursing Station'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Station'}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{formError}</p>}
        <FormField label="Station Name" required>
          <AdminInput placeholder="e.g. NS-01 / Central Station" {...field('name')} />
        </FormField>
        <FormField label="Station Number">
          <AdminInput placeholder="e.g. STA-101 (optional)" {...field('station_no')} />
        </FormField>
        <FormField label="Department" required>
          <AdminSelect {...field('department_id')}>
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </AdminSelect>
        </FormField>
      </EntityForm>

      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Nursing Station' : 'Activate Nursing Station'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
