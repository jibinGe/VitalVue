import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, RefreshCw, Plus, MapPin, ChevronRight,
  GitBranch, BedDouble, Activity, LayoutGrid, List, Search,
  Edit2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import EntityTable from '../../components/admin/EntityTable';
import EntityForm, { FormField, AdminInput } from '../../components/admin/EntityForm';
import ConfirmModal from '../../components/admin/ConfirmModal';
import StatusBadge from '../../components/admin/StatusBadge';
import { adminService } from '../../services/adminService';
import { useAdmin } from '../../contexts/AdminContext';

const EMPTY_FORM = { name: '', country: '', state: '', city: '', latitude: '', longitude: '' };

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { openQuickAdd, triggerRefresh, refreshKey, setSelectedOrgId } = useAdmin();

  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [search, setSearch] = useState('');

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
    const [orgRes, deptRes, wardRes, bedRes] = await Promise.all([
      adminService.listOrganizations(),
      adminService.listDepartments(),
      adminService.listWards(),
      adminService.listBeds(),
    ]);

    if (orgRes.success) {
      setData(Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.items ?? []);
    }
    if (deptRes.success) {
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.items ?? []);
    }
    if (wardRes.success) {
      setWards(Array.isArray(wardRes.data) ? wardRes.data : wardRes.data?.items ?? []);
    }
    if (bedRes.success) {
      setBeds(Array.isArray(bedRes.data) ? bedRes.data : bedRes.data?.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Enrich orgs with counts
  const enrichedOrgs = useMemo(() => {
    return data.map((org) => {
      const orgDepts = departments.filter((d) => d.organization_id === org.id);
      const orgDeptIds = new Set(orgDepts.map((d) => d.id));
      const orgWards = wards.filter((w) => orgDeptIds.has(w.department_id));
      const orgWardIds = new Set(orgWards.map((w) => w.id));
      const orgBeds = beds.filter((b) => orgWardIds.has(b.ward_id));
      const occupiedBeds = orgBeds.filter((b) => b.is_occupied).length;

      return {
        ...org,
        deptCount: orgDepts.length,
        wardCount: orgWards.length,
        bedCount: orgBeds.length,
        occupiedCount: occupiedBeds,
      };
    });
  }, [data, departments, wards, beds]);

  const filteredOrgs = useMemo(() => {
    if (!search.trim()) return enrichedOrgs;
    const q = search.toLowerCase();
    return enrichedOrgs.filter(
      (o) =>
        o.name?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q) ||
        o.state?.toLowerCase().includes(q) ||
        o.country?.toLowerCase().includes(q)
    );
  }, [enrichedOrgs, search]);

  const openAdd = () => {
    openQuickAdd('organization');
  };

  const openEdit = (row, e) => {
    e?.stopPropagation();
    setEditTarget(row);
    setFormData({
      name: row.name || '',
      country: row.country || '',
      state: row.state || '',
      city: row.city || '',
      latitude: row.latitude || '',
      longitude: row.longitude || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Organization name is required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    const res = editTarget
      ? await adminService.updateOrganization(editTarget.id, formData)
      : await adminService.createOrganization(formData);
    setFormLoading(false);
    if (res.success) {
      setFormOpen(false);
      fetchData();
      triggerRefresh();
    } else {
      setFormError(res.message);
    }
  };

  const openToggle = (row, e) => {
    e?.stopPropagation();
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
    triggerRefresh();
  };

  const handleCardClick = (org) => {
    setSelectedOrgId(org.id);
    navigate(`/admin/organizations/${org.id}`);
  };

  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData((f) => ({ ...f, [key]: e.target.value })),
  });

  const COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Organization' },
    { key: 'city', label: 'City' },
    { key: 'deptCount', label: 'Depts', render: (v) => `${v || 0} depts` },
    { key: 'bedCount', label: 'Beds', render: (v, r) => `${v || 0} (${r.occupiedCount || 0} occupied)` },
    { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ];

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
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hospital Networks</h1>
            <p className="text-white/40 text-xs">
              Manage hospitals, medical centres, and facility command hubs ({data.length} registered)
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 shadow-md shadow-[#CCA166]/15 transition-all"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Add Hospital</span>
          </button>
        </div>
      </motion.div>

      {/* ── Toolbar: Search & View Toggle ───────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            type="text"
            placeholder="Search hospitals by name, city, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#CCA166]/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1E1E21] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              viewMode === 'grid' ? 'bg-[#CCA166] text-[#1A1A1C]' : 'text-white/40 hover:text-white'
            }`}
            title="Card Grid"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              viewMode === 'table' ? 'bg-[#CCA166] text-[#1A1A1C]' : 'text-white/40 hover:text-white'
            }`}
            title="Table View"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Grid View ─────────────────────────────────────────────────── */}
      {viewMode === 'grid' ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-10 border-3 border-[#CCA166]/20 border-t-[#CCA166] rounded-full animate-spin" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="bg-[#1E1E21] border border-white/5 rounded-2xl p-12 text-center">
            <Building2 className="size-10 text-white/20 mx-auto mb-3" />
            <p className="text-white font-medium text-sm">No hospitals match your search</p>
            <p className="text-white/40 text-xs mt-1">Try clearing filters or add a new hospital</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrgs.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleCardClick(org)}
                className="bg-[#1E1E21] border border-white/5 hover:border-[#CCA166]/30 rounded-2xl p-5 cursor-pointer group transition-all duration-200 shadow-lg flex flex-col justify-between relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-[#CCA166]/10 border border-[#CCA166]/20 text-[#CCA166] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base group-hover:text-[#CCA166] transition-colors leading-tight">
                          {org.name}
                        </h3>
                        <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                          <MapPin className="size-3 text-[#CCA166]/70" />
                          {org.city ? `${org.city}, ` : ''}{org.country}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={org.is_active} />
                  </div>

                  {/* Stats snippet */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 my-3 bg-white/2 rounded-xl px-3">
                    <div>
                      <p className="text-[10px] text-white/40 font-medium uppercase">Departments</p>
                      <p className="text-sm font-bold text-white mt-0.5">{org.deptCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-medium uppercase">Wards</p>
                      <p className="text-sm font-bold text-white mt-0.5">{org.wardCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-medium uppercase">Beds</p>
                      <p className="text-sm font-bold text-[#CCA166] mt-0.5">{org.bedCount}</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-[#CCA166] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open Command Center <ChevronRight className="size-3.5" />
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => openEdit(org, e)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                      title="Edit Hospital"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => openToggle(org, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        org.is_active ? 'text-emerald-400 hover:text-red-400' : 'text-white/30 hover:text-emerald-400'
                      }`}
                      title="Toggle Active Status"
                    >
                      {org.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* ── Table View ────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E1E21] border border-white/5 rounded-2xl p-5"
        >
          <EntityTable
            columns={COLUMNS}
            data={filteredOrgs}
            isLoading={loading}
            onRowClick={handleCardClick}
            onEdit={openEdit}
            onToggleStatus={openToggle}
            onAdd={openAdd}
            addLabel="Add Hospital"
            searchPlaceholder="Filter table..."
            emptyMessage="No organizations found."
          />
        </motion.div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <EntityForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        title={editTarget ? 'Edit Hospital Info' : 'Add Hospital'}
        submitLabel={editTarget ? 'Save Changes' : 'Create Hospital'}
        isLoading={formLoading}
      >
        {formError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
            {formError}
          </p>
        )}
        <FormField label="Hospital Name" required>
          <AdminInput placeholder="e.g. City General Hospital" {...field('name')} />
        </FormField>
        <FormField label="Country">
          <AdminInput placeholder="e.g. India" {...field('country')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="State">
            <AdminInput placeholder="e.g. Karnataka" {...field('state')} />
          </FormField>
          <FormField label="City">
            <AdminInput placeholder="e.g. Bangalore" {...field('city')} />
          </FormField>
          <FormField label="Latitude">
            <AdminInput type="number" step="any" placeholder="12.9716" {...field('latitude')} />
          </FormField>
          <FormField label="Longitude">
            <AdminInput type="number" step="any" placeholder="77.5946" {...field('longitude')} />
          </FormField>
        </div>
      </EntityForm>

      {/* ── Status Confirm Modal ───────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={handleToggleStatus}
        isLoading={confirmLoading}
        title={confirmTarget?.is_active ? 'Deactivate Hospital' : 'Activate Hospital'}
        message={`Are you sure you want to ${confirmTarget?.is_active ? 'deactivate' : 'activate'} "${confirmTarget?.name}"?`}
        confirmLabel={confirmTarget?.is_active ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}
