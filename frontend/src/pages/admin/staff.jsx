import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Stethoscope, UserCheck, RefreshCw } from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';

const DOCTOR_COLUMNS = [
  { key: 'user_id', label: 'Staff ID' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const NURSE_COLUMNS = [
  { key: 'user_id', label: 'Staff ID' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'license_no', label: 'License No.' },
  { key: 'phone_number', label: 'Phone' },
  { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
];

const EMPTY_DOCTOR = { user_id: '', full_name: '', phone_number: '', specialization: '', organization_id: '' };
const EMPTY_NURSE = { user_id: '', full_name: '', phone_number: '', license_no: '', organization_id: '' };

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [drRes, nrRes, orgRes] = await Promise.all([
      adminService.listDoctors(),
      adminService.listNurses(),
      adminService.listOrganizations(),
    ]);
    if (drRes.success) setDoctors(Array.isArray(drRes.data) ? drRes.data : drRes.data?.items ?? []);
    if (nrRes.success) setNurses(Array.isArray(nrRes.data) ? nrRes.data : nrRes.data?.items ?? []);
    if (orgRes.success) setOrgs(Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditTarget(null);
    setFormData(activeTab === 'doctors' ? { ...EMPTY_DOCTOR } : { ...EMPTY_NURSE });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditTarget(row);
    if (activeTab === 'doctors') {
      setFormData({ user_id: row.user_id || '', full_name: row.full_name || '', phone_number: row.phone_number || '', specialization: row.specialization || '', organization_id: row.organization_id || '' });
    } else {
      setFormData({ user_id: row.user_id || '', full_name: row.full_name || '', phone_number: row.phone_number || '', license_no: row.license_no || '', organization_id: row.organization_id || '' });
    }
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.full_name?.trim()) { setFormError('Full name is required.'); return; }
    if (!formData.user_id?.trim()) { setFormError('Staff ID is required.'); return; }
    setFormLoading(true);
    setFormError('');
    let res;
    if (activeTab === 'doctors') {
      res = editTarget
        ? await adminService.updateDoctor(editTarget.id, formData)
        : await adminService.createDoctor(formData);
    } else {
      res = editTarget
        ? await adminService.updateNurse(editTarget.id, formData)
        : await adminService.createNurse(formData);
    }
    setFormLoading(false);
    if (res.success) { setFormOpen(false); fetchData(); }
    else setFormError(res.message);
  };

  const openToggle = (row) => { setConfirmTarget(row); setConfirmOpen(true); };

  const handleToggleStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    const status = !confirmTarget.is_active;
    if (activeTab === 'doctors') await adminService.setDoctorStatus(confirmTarget.id, status);
    else await adminService.setNurseStatus(confirmTarget.id, status);
    setConfirmLoading(false);
    setConfirmOpen(false);
    setConfirmTarget(null);
    fetchData();
  };

  const field = (key) => ({
    value: formData[key] ?? '',
    onChange: (e) => setFormData((f) => ({ ...f, [key]: e.target.value })),
  });

  const isDoctor = activeTab === 'doctors';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <Users className="size-5 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Doctors & Nurses</h1>
            <p className="text-white/35 text-sm">Manage medical and nursing staff across your organization</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <RefreshCw className="size-4" />
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-max">
        {[
          { key: 'doctors', label: 'Doctors', icon: Stethoscope },
          { key: 'nurses', label: 'Nurses', icon: UserCheck },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-[#CCA166] text-white shadow-lg shadow-[#CCA166]/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-white/50">
          <Stethoscope className="size-3.5 text-[#CCA166]" />
          {doctors.length} Doctors
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-white/50">
          <UserCheck className="size-3.5 text-[#CCA166]" />
          {nurses.length} Nurses
        </div>
      </div>

      {/* Table */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5">
        <EntityTable
          columns={isDoctor ? DOCTOR_COLUMNS : NURSE_COLUMNS}
          data={isDoctor ? doctors : nurses}
          isLoading={loading}
          onEdit={openEdit}
          onToggleStatus={openToggle}
          onAdd={openAdd}
          addLabel={isDoctor ? 'Add Doctor' : 'Add Nurse'}
          searchPlaceholder={isDoctor ? 'Search doctors...' : 'Search nurses...'}
          emptyMessage={`No ${isDoctor ? 'doctors' : 'nurses'} found.`}
        />
      </motion.div>

      {/* Form */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? `Edit ${isDoctor ? 'Doctor' : 'Nurse'}` : `Add ${isDoctor ? 'Doctor' : 'Nurse'}`}
        submitLabel={editTarget ? 'Save Changes' : `Create ${isDoctor ? 'Doctor' : 'Nurse'}`}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{formError}</p>}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Staff ID" required>
            <AdminInput placeholder={isDoctor ? 'e.g. DR-001' : 'e.g. NR-001'} {...field('user_id')} />
          </FormField>
          <FormField label="Phone Number" required>
            <AdminInput placeholder="+91 9999999999" type="tel" {...field('phone_number')} />
          </FormField>
        </div>

        <FormField label="Full Name" required>
          <AdminInput placeholder="e.g. Dr. Anjali Sharma" {...field('full_name')} />
        </FormField>

        {isDoctor ? (
          <FormField label="Specialization">
            <AdminInput placeholder="e.g. Cardiologist" {...field('specialization')} />
          </FormField>
        ) : (
          <FormField label="License Number" required>
            <AdminInput placeholder="e.g. MCI-2024-XXXX" {...field('license_no')} />
          </FormField>
        )}

        <FormField label="Organization">
          <AdminSelect {...field('organization_id')}>
            <option value="">Select organization...</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </AdminSelect>
        </FormField>
      </EntityForm>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? `Deactivate ${isDoctor ? 'Doctor' : 'Nurse'}` : `Activate ${isDoctor ? 'Doctor' : 'Nurse'}`}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.full_name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
