import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, RefreshCw } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';

const WARD_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Ward Name' },
  { key: 'department_name', label: 'Department' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const BED_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'bed_number', label: 'Bed No.' },
  { key: 'ward_name', label: 'Ward' },
  { key: 'is_occupied', label: 'Occupancy', render: (v) => <StatusBadge status={v ? 'occupied' : 'available'} /> },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

export default function WardsPage() {
  const [activeTab, setActiveTab] = useState('wards');
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [wardRes, bedRes, deptRes, stationRes] = await Promise.all([
      adminService.listWards(),
      adminService.listBeds(),
      adminService.listDepartments(),
      adminService.listStations(),
    ]);
    if (wardRes.success) setWards(Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? []);
    if (bedRes.success) setBeds(Array.isArray(bedRes.data) ? bedRes.data : bedRes.data?.items ?? []);
    if (deptRes.success) setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    if (stationRes.success) setStations(Array.isArray(stationRes.data) ? stationRes.data : stationRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(activeTab === 'wards' ? { name: '', department_id: '', station_id: '' } : { bed_number: '', ward_id: '' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditTarget(row);
    if (activeTab === 'wards') setFormData({ name: row.name || '', department_id: row.department_id || '', station_id: row.station_id || '' });
    else setFormData({ bed_number: row.bed_no || '', ward_id: row.ward_id || '' });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormLoading(true);
    setFormError('');
    let res;
    if (activeTab === 'wards') {
      if (!formData.name?.trim()) { setFormError('Ward name is required.'); setFormLoading(false); return; }
      const wardPayload = {
        name: formData.name.trim(),
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
        station_id: formData.station_id ? Number(formData.station_id) : null,
      };
      res = editTarget
        ? await adminService.updateWard(editTarget.id, wardPayload)
        : await adminService.createWard(wardPayload);
    } else {
      if (!formData.bed_number?.trim()) { setFormError('Bed number is required.'); setFormLoading(false); return; }
      // Backend expects 'bed_no', not 'bed_number'
      const bedPayload = { bed_no: formData.bed_number.trim(), ward_id: formData.ward_id };
      res = editTarget
        ? await adminService.updateBed(editTarget.id, bedPayload)
        : await adminService.createBed(bedPayload);
    }
    setFormLoading(false);
    if (res.success) { setFormOpen(false); fetchData(); }
    else setFormError(res.message);
  };

  const openToggle = (row) => { setConfirmTarget(row); setConfirmOpen(true); };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const newStatus = !confirmTarget.is_active;
    if (activeTab === 'wards') await adminService.setWardStatus(confirmTarget.id, newStatus);
    else await adminService.setBedStatus(confirmTarget.id, newStatus);
    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmTarget(null);
    fetchData();
  };

  const field = (key) => ({
    value: formData[key] ?? '',
    onChange: (e) => setFormData((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <BedDouble className="size-5 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Wards & Beds</h1>
            <p className="text-white/35 text-sm">Manage clinical wards and bed allocation</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="size-4" />
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-max">
        {['wards', 'beds'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-[#CCA166] text-white shadow-lg shadow-[#CCA166]/20'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
      >
        <EntityTable
          columns={activeTab === 'wards' ? WARD_COLUMNS : BED_COLUMNS}
          data={activeTab === 'wards' ? wards : beds}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel={activeTab === 'wards' ? 'Add Ward' : 'Add Bed'}
          searchPlaceholder={activeTab === 'wards' ? 'Search wards...' : 'Search beds...'}
          emptyMessage={`No ${activeTab} found.`}
        />
      </motion.div>

      {/* Form */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? `Edit ${activeTab === 'wards' ? 'Ward' : 'Bed'}` : `Add ${activeTab === 'wards' ? 'Ward' : 'Bed'}`}
        submitLabel={editTarget ? 'Save Changes' : 'Create'}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{formError}</p>}
        {activeTab === 'wards' ? (
          <>
            <FormField label="Ward Name" required>
              <AdminInput placeholder="e.g. ICU - Ward A" {...field('name')} />
            </FormField>
            <FormField label="Department" required>
              <AdminSelect {...field('department_id')}>
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </AdminSelect>
            </FormField>
            <FormField label="Nursing Station">
              <AdminSelect {...field('station_id')}>
                <option value="">No station (optional)</option>
                {stations
                  .filter((s) => !formData.department_id || s.department_id === Number(formData.department_id))
                  .map((s) => <option key={s.id} value={s.id}>{s.name}{s.station_no ? ` (${s.station_no})` : ''}</option>)
                }
              </AdminSelect>
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Bed Number" required>
              <AdminInput placeholder="e.g. BED-101" {...field('bed_number')} />
            </FormField>
            <FormField label="Ward" required>
              <AdminSelect {...field('ward_id')}>
                <option value="">Select ward...</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </AdminSelect>
            </FormField>
          </>
        )}
      </EntityForm>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? `Deactivate ${activeTab === 'wards' ? 'Ward' : 'Bed'}` : `Activate ${activeTab === 'wards' ? 'Ward' : 'Bed'}`}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} this record?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
