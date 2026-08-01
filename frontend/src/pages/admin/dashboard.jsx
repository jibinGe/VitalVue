import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, GitBranch, BedDouble, Users,
  Stethoscope, UserCheck, Activity, TrendingUp,
} from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import { adminService } from '../../services/adminService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState({
    organizations: null,
    departments: null,
    wards: null,
    beds: null,
    doctors: null,
    nurses: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [orgs, depts, wards, beds, doctors, nurses] = await Promise.allSettled([
        adminService.listOrganizations(),
        adminService.listDepartments(),
        adminService.listWards(),
        adminService.listBeds(),
        adminService.listDoctors(),
        adminService.listNurses(),
      ]);

      const count = (res) => {
        if (res.status === 'fulfilled' && res.value.success) {
          const d = res.value.data;
          return Array.isArray(d) ? d.length : d?.total ?? d?.count ?? '—';
        }
        return '—';
      };

      setStats({
        organizations: count(orgs),
        departments: count(depts),
        wards: count(wards),
        beds: count(beds),
        doctors: count(doctors),
        nurses: count(nurses),
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const STAT_CARDS = [
    { title: 'Organizations', key: 'organizations', icon: Building2 },
    { title: 'Departments', key: 'departments', icon: GitBranch },
    { title: 'Wards', key: 'wards', icon: BedDouble },
    { title: 'Beds', key: 'beds', icon: Activity },
    { title: 'Doctors', key: 'doctors', icon: Stethoscope },
    { title: 'Nurses', key: 'nurses', icon: UserCheck },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Welcome back, <span className="text-[#CCA166]">{admin?.name?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Here's an overview of your VitalVue system.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[#CCA166]/8 border border-[#CCA166]/15 rounded-xl">
            <TrendingUp className="size-4 text-[#CCA166]" />
            <span className="text-[#CCA166] text-sm font-medium">Live System</span>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">System Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAT_CARDS.map((card, i) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={loading ? null : stats[card.key]}
              icon={card.icon}
              delay={i * 0.07}
            />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Add Organization', desc: 'Register a new hospital or clinic', href: '/admin/organizations', icon: Building2 },
            { label: 'Add Staff', desc: 'Onboard doctors or nurses', href: '/admin/staff', icon: Users },
            { label: 'Configure Wards', desc: 'Manage wards and bed allocation', href: '/admin/wards', icon: BedDouble },
          ].map((action, i) => (
            <motion.a
              key={action.label}
              href={action.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              whileHover={{ y: -3 }}
              className="flex items-start gap-4 p-5 bg-[#2F2F31]/50 hover:bg-[#2F2F31]/80 border border-white/5 hover:border-[#CCA166]/15 rounded-2xl transition-all duration-200 group"
            >
              <div className="p-2.5 rounded-xl bg-[#CCA166]/8 border border-[#CCA166]/10 group-hover:bg-[#CCA166]/15 transition-colors">
                <action.icon className="size-5 text-[#CCA166]" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{action.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{action.desc}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Divider section — system info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="p-6 bg-[#2F2F31]/30 border border-white/5 rounded-2xl flex flex-wrap gap-6 items-center"
      >
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/50">System Online</span>
        </div>
        <div className="text-sm text-white/30">
          API: <span className="text-white/60">vitalvue-api.genesysailabs.com</span>
        </div>
        <div className="text-sm text-white/30">
          Role: <span className="text-[#CCA166]">Master Admin</span>
        </div>
        <div className="text-sm text-white/30 ml-auto">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </motion.div>
    </div>
  );
}
