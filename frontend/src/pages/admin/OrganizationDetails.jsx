import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronLeft, GitBranch, Stethoscope, ChevronRight, ChevronDown, Plus, Activity, Bed, Trash2 } from 'lucide-react';
import { adminService } from '../../services/adminService';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput, AdminSelect } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';

export default function OrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departments');

  // Hierarchy Data
  const [departments, setDepartments] = useState([]);
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [wardsByDept, setWardsByDept] = useState({});
  const [expandedWards, setExpandedWards] = useState(new Set());
  const [bedsByWard, setBedsByWard] = useState({});

  // Doctors Data
  const [doctors, setDoctors] = useState([]);

  // Generic Form State
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState(''); // 'department', 'ward', 'bed', 'doctor'
  const [formParentId, setFormParentId] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    const res = await adminService.getOrganization(id);
    if (res.success) {
      setOrg(res.data);
    } else {
      navigate('/admin/organizations'); // redirect if not found
    }
    setLoading(false);
  }, [id, navigate]);

  const fetchDepartments = useCallback(async () => {
    const res = await adminService.listDepartments({ organization_id: id });
    if (res.success) setDepartments(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
  }, [id]);

  const fetchDoctors = useCallback(async () => {
    const res = await adminService.listDoctors({ organization_id: id });
    if (res.success) setDoctors(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
  }, [id]);

  useEffect(() => {
    fetchOrganization();
    fetchDepartments();
    fetchDoctors();
  }, [fetchOrganization, fetchDepartments, fetchDoctors]);

  const toggleDept = async (deptId) => {
    const next = new Set(expandedDepts);
    if (next.has(deptId)) {
      next.delete(deptId);
    } else {
      next.add(deptId);
      if (!wardsByDept[deptId]) {
        const res = await adminService.listWards({ department_id: deptId });
        if (res.success) {
          setWardsByDept(prev => ({ ...prev, [deptId]: Array.isArray(res.data) ? res.data : res.data?.items ?? [] }));
        }
      }
    }
    setExpandedDepts(next);
  };

  const toggleWard = async (wardId) => {
    const next = new Set(expandedWards);
    if (next.has(wardId)) {
      next.delete(wardId);
    } else {
      next.add(wardId);
      if (!bedsByWard[wardId]) {
        const res = await adminService.listBeds({ ward_id: wardId });
        if (res.success) {
          setBedsByWard(prev => ({ ...prev, [wardId]: Array.isArray(res.data) ? res.data : res.data?.items ?? [] }));
        }
      }
    }
    setExpandedWards(next);
  };

  // --- Forms ---
  const openForm = (type, parentId = null) => {
    setFormType(type);
    setFormParentId(parentId);
    setFormError('');
    if (type === 'department') setFormData({ name: '' });
    else if (type === 'ward') setFormData({ name: '' });
    else if (type === 'bed') setFormData({ bed_no: '' });
    else if (type === 'doctor') setFormData({ user_id: '', full_name: '', phone_number: '', specialization: '' });
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormLoading(true);
    setFormError('');
    let res;
    if (formType === 'department') {
      res = await adminService.createDepartment({ ...formData, organization_id: parseInt(id) });
      if (res.success) fetchDepartments();
    } else if (formType === 'ward') {
      res = await adminService.createWard({ ...formData, department_id: formParentId });
      if (res.success) {
        const wr = await adminService.listWards({ department_id: formParentId });
        if (wr.success) setWardsByDept(prev => ({ ...prev, [formParentId]: Array.isArray(wr.data) ? wr.data : wr.data?.items ?? [] }));
      }
    } else if (formType === 'bed') {
      res = await adminService.createBed({ ...formData, ward_id: formParentId });
      if (res.success) {
        const br = await adminService.listBeds({ ward_id: formParentId });
        if (br.success) setBedsByWard(prev => ({ ...prev, [formParentId]: Array.isArray(br.data) ? br.data : br.data?.items ?? [] }));
      }
    } else if (formType === 'doctor') {
      res = await adminService.createDoctor({ ...formData, organization_id: parseInt(id), password: 'password123' }); // default password for simplicity
      if (res.success) fetchDoctors();
    }

    setFormLoading(false);
    if (res.success) setFormOpen(false);
    else setFormError(res.message);
  };

  const field = (key) => ({
    value: formData[key] || '',
    onChange: (e) => setFormData(f => ({ ...f, [key]: e.target.value })),
  });

  if (loading || !org) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <button onClick={() => navigate('/admin/organizations')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit text-sm">
          <ChevronLeft className="size-4" /> Back to Organizations
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <Building2 className="size-6 text-[#CCA166]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <p className="text-white/40 text-sm">{org.city}, {org.state} • {org.country}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'departments' ? 'bg-[#CCA166]/20 text-[#CCA166]' : 'text-white/40 hover:bg-white/5 hover:text-white'
          }`}
        >
          <GitBranch className="size-4" /> Departments & Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'doctors' ? 'bg-[#CCA166]/20 text-[#CCA166]' : 'text-white/40 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Stethoscope className="size-4" /> Doctors
        </button>
      </div>

      {/* Content */}
      {activeTab === 'departments' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Departments</h2>
            <button
              onClick={() => openForm('department')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
            >
              <Plus className="size-4" /> Add Department
            </button>
          </div>

          <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-2 space-y-2">
            {departments.length === 0 ? (
              <p className="text-white/30 text-sm p-4 text-center">No departments found.</p>
            ) : (
              departments.map(dept => (
                <div key={dept.id} className="border border-white/5 bg-white/5 rounded-xl overflow-hidden">
                  <div
                    onClick={() => toggleDept(dept.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#B2884D]/10 text-[#B2884D] rounded-lg">
                        <Activity className="size-4" />
                      </div>
                      <span className="font-semibold text-white/90">{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openForm('ward', dept.id); }}
                        className="text-xs flex items-center gap-1 text-[#CCA166] hover:text-white bg-[#CCA166]/10 px-2 py-1 rounded-md transition-colors"
                      >
                        <Plus className="size-3" /> Add Ward
                      </button>
                      {expandedDepts.has(dept.id) ? <ChevronDown className="size-4 text-white/40" /> : <ChevronRight className="size-4 text-white/40" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedDepts.has(dept.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-[#1A1A1C]/50 pl-10 pr-4 py-3 space-y-2 overflow-hidden"
                      >
                        {!(wardsByDept[dept.id]?.length > 0) ? (
                          <p className="text-white/30 text-xs py-2">No wards configured.</p>
                        ) : (
                          wardsByDept[dept.id].map(ward => (
                            <div key={ward.id} className="border border-white/5 bg-[#222225] rounded-lg overflow-hidden">
                              <div
                                onClick={() => toggleWard(ward.id)}
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <Bed className="size-3.5 text-white/50" />
                                  <span className="text-sm font-medium text-white/80">{ward.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openForm('bed', ward.id); }}
                                    className="text-[11px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-1.5 py-0.5 rounded transition-colors"
                                  >
                                    <Plus className="size-3" /> Add Bed
                                  </button>
                                  {expandedWards.has(ward.id) ? <ChevronDown className="size-3.5 text-white/40" /> : <ChevronRight className="size-3.5 text-white/40" />}
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedWards.has(ward.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-white/5 bg-black/20 p-3 overflow-hidden"
                                  >
                                    {!(bedsByWard[ward.id]?.length > 0) ? (
                                      <p className="text-white/30 text-xs">No beds added.</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {bedsByWard[ward.id].map(bed => (
                                          <div key={bed.id} className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center gap-2 text-xs text-white/70">
                                            <span>{bed.bed_no}</span>
                                            <div className={`size-1.5 rounded-full ${bed.is_occupied ? 'bg-red-400' : 'bg-emerald-400'}`} title={bed.is_occupied ? 'Occupied' : 'Available'} />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'doctors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <EntityTable
            columns={[
              { key: 'user_id', label: 'Doctor ID' },
              { key: 'full_name', label: 'Name' },
              { key: 'specialization', label: 'Specialization' },
              { key: 'phone_number', label: 'Phone' }
            ]}
            data={doctors}
            onAdd={() => openForm('doctor')}
            addLabel="Add Doctor"
            searchPlaceholder="Search doctors..."
            emptyMessage="No doctors assigned to this organization."
          />
        </motion.div>
      )}

      {/* Reusable Form Drawer */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={`Add ${formType.charAt(0).toUpperCase() + formType.slice(1)}`}
        submitLabel={`Create ${formType.charAt(0).toUpperCase() + formType.slice(1)}`}
        isLoading={formLoading}
      >
        {formError && <p className="text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3 mb-4">{formError}</p>}
        
        {formType === 'department' && (
          <FormField label="Department Name" required>
            <AdminInput placeholder="e.g. Cardiology" {...field('name')} />
          </FormField>
        )}
        
        {formType === 'ward' && (
          <FormField label="Ward Name" required>
            <AdminInput placeholder="e.g. ICU-A" {...field('name')} />
          </FormField>
        )}
        
        {formType === 'bed' && (
          <FormField label="Bed Number" required>
            <AdminInput placeholder="e.g. B-101" {...field('bed_no')} />
          </FormField>
        )}
        
        {formType === 'doctor' && (
          <div className="space-y-4">
            <FormField label="Doctor ID (Login ID)" required>
              <AdminInput placeholder="e.g. DOC-123" {...field('user_id')} />
            </FormField>
            <FormField label="Full Name" required>
              <AdminInput placeholder="e.g. Dr. Jane Smith" {...field('full_name')} />
            </FormField>
            <FormField label="Phone Number" required>
              <AdminInput placeholder="e.g. +1234567890" {...field('phone_number')} />
            </FormField>
            <FormField label="Specialization">
              <AdminInput placeholder="e.g. Neurologist" {...field('specialization')} />
            </FormField>
          </div>
        )}
      </EntityForm>
    </div>
  );
}
