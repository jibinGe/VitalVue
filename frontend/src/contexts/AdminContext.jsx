import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '../services/adminService';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  
  // Persisted selected hospital (null means "All Hospitals")
  const [selectedOrgId, setSelectedOrgIdState] = useState(() => {
    const saved = localStorage.getItem('adminSelectedOrgId');
    return saved && saved !== 'all' ? Number(saved) : null;
  });

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Quick Add Drawer State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState('department');
  const [quickAddDefaults, setQuickAddDefaults] = useState({});

  // Global Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 4000);
  }, []);

  const fetchOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    const res = await adminService.listOrganizations();
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      setOrganizations(list);
    }
    setLoadingOrgs(false);
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations, refreshKey]);

  const setSelectedOrgId = useCallback((id) => {
    if (!id || id === 'all') {
      setSelectedOrgIdState(null);
      localStorage.removeItem('adminSelectedOrgId');
    } else {
      const numId = Number(id);
      setSelectedOrgIdState(numId);
      localStorage.setItem('adminSelectedOrgId', String(numId));
    }
  }, []);

  const selectedOrg = useMemo(() => {
    if (!selectedOrgId) return null;
    return organizations.find((o) => o.id === selectedOrgId) || null;
  }, [selectedOrgId, organizations]);

  const openQuickAdd = useCallback((type = 'department', defaults = {}) => {
    setQuickAddType(type);
    setQuickAddDefaults(defaults);
    setQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      organizations,
      loadingOrgs,
      fetchOrganizations,
      selectedOrgId,
      setSelectedOrgId,
      selectedOrg,
      refreshKey,
      triggerRefresh,
      quickAddOpen,
      quickAddType,
      quickAddDefaults,
      openQuickAdd,
      closeQuickAdd,
      toast,
      showToast,
    }),
    [
      organizations,
      loadingOrgs,
      fetchOrganizations,
      selectedOrgId,
      setSelectedOrgId,
      selectedOrg,
      refreshKey,
      triggerRefresh,
      quickAddOpen,
      quickAddType,
      quickAddDefaults,
      openQuickAdd,
      closeQuickAdd,
      toast,
      showToast,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
