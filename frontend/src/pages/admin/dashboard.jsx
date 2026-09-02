import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, GitBranch, BedDouble, Users,
  Stethoscope, UserCheck, Activity, TrendingUp, Radio,
  Plus, ChevronRight, Layers, Sparkles, MapPin,
} from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import { adminService } from '../../services/adminService';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import StatusBadge from '../../components/admin/StatusBadge';

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const { openQuickAdd, setSelectedOrgId } = useAdmin();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    organizations: null,
    departments: null,
    stations: null,
    wards: null,
    beds: null,
    occupiedBeds: 0,
    doctors: null,
    nurses: null,
  });
  const [orgList, setOrgList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [orgs, depts, stations, wards, beds, doctors, nurses] = await Promise.allSettled([
        adminService.listOrganizations(),
        adminService.listDepartments(),
        adminService.listStations(),
        adminService.listWards(),
        adminService.listBeds(),
        adminService.listDoctors(),
        adminService.listNurses(),
      ]);

      const count = (res) => {
        if (res.status === 'fulfilled' && res.value.success) {
          const d = res.value.data;
          return Array.isArray(d) ? d.length : d?.total ?? d?.count ?? 0;
        }
        return 0;
      };

      const bedData = beds.status === 'fulfilled' && beds.value.success ? beds.value.data : [];
      const allBeds = Array.isArray(bedData) ? bedData : [];
      const occupied = allBeds.filter((b) => b.is_occupied).length;

      if (orgs.status === 'fulfilled' && orgs.value.success) {
        const list = Array.isArray(orgs.value.data) ? orgs.value.data : orgs.value.data?.items ?? [];
        setOrgList(list.slice(0, 4));
      }

      setStats({
        organizations: count(orgs),
        departments: count(depts),
        stations: count(stations),
        wards: count(wards),
        beds: count(beds),
        occupiedBeds: occupied,
        doctors: count(doctors),
        nurses: count(nurses),
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const totalBeds = Number(stats.beds) || 0;
  const occupiedBeds = stats.occupiedBeds || 0;
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const STAT_CARDS = [
    { title: 'Hospitals', key: 'organizations', icon: Building2, href: '/admin/organizations' },
    { title: 'Departments', key: 'departments', icon: GitBranch, href: '/admin/departments' },
    { title: 'Wards', key: 'wards', icon: BedDouble, href: '/admin/wards' },
    { title: 'Total Beds', key: 'beds', icon: Activity, href: '/admin/wards', highlight: `${availableBeds} free` },
    { title: 'Doctors', key: 'doctors', icon: Stethoscope, href: '/admin/staff' },
    { title: 'Nurses', key: 'nurses', icon: UserCheck, href: '/admin/staff' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Welcome Banner ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#1E1E21] border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CCA166]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-widest text-[#CCA166]">
                Master Administrator Command Hub
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome back, <span className="text-[#CCA166]">{admin?.name?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p className="text-white/40 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Real-time monitoring and administrative governance for VitalVue telemetry network, hospitals, clinical wards, and medical staff.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openQuickAdd('organization')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#1A1A1C] bg-gradient-to-r from-[#B2884D] to-[#CCA166] hover:opacity-90 shadow-lg shadow-[#CCA166]/20 transition-all"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Register Hospital</span>
            </button>
          </div>
        </div>

        {/* Live Bed Occupancy Bar */}
        <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60 font-medium">Network Bed Capacity</span>
              <span className="text-white font-bold">
                {occupiedBeds} of {totalBeds} Beds Occupied ({occupancyPercent}%)
              </span>
            </div>
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-rose-500 h-full transition-all duration-700"
                style={{ width: `${occupancyPercent}%` }}
                title={`Occupied: ${occupiedBeds}`}
              />
              <div
                className="bg-emerald-500/80 h-full transition-all duration-700"
                style={{ width: `${100 - occupancyPercent}%` }}
                title={`Available: ${availableBeds}`}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" /> Occupied: {occupiedBeds}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" /> Free: {availableBeds}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-white/3 rounded-xl border border-white/5 flex items-center gap-3.5">
            <div className="p-2.5 bg-[#CCA166]/10 rounded-xl text-[#CCA166]">
              <Activity className="size-5" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Telemetry Link</p>
              <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live & Synchronized
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics Grid ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">System Snapshot</p>
          <Link to="/admin/organizations" className="text-xs text-[#CCA166] hover:underline flex items-center gap-1 font-medium">
            View All Facilities <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {STAT_CARDS.map((card, i) => (
            <Link key={card.key} to={card.href}>
              <StatCard
                title={card.title}
                value={loading ? null : stats[card.key]}
                icon={card.icon}
                delay={i * 0.05}
              />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick Facility Launcher ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          Hospital Command Centers
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {orgList.map((org) => (
            <motion.div
              key={org.id}
              whileHover={{ y: -3 }}
              onClick={() => {
                setSelectedOrgId(org.id);
                navigate(`/admin/organizations/${org.id}`);
              }}
              className="bg-[#1E1E21] border border-white/5 hover:border-[#CCA166]/30 p-4 rounded-2xl cursor-pointer transition-all flex flex-col justify-between shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-[#CCA166]/10 text-[#CCA166] group-hover:scale-105 transition-transform">
                    <Building2 className="size-4" />
                  </div>
                  <StatusBadge status={org.is_active} />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#CCA166] transition-colors line-clamp-1">
                  {org.name}
                </h4>
                <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                  <MapPin className="size-3 text-[#CCA166]/60" />
                  {org.city || org.country}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#CCA166] font-semibold">
                <span>Enter Command Center</span>
                <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}

          {/* Add New Hospital Card */}
          <motion.div
            whileHover={{ y: -3 }}
            onClick={() => openQuickAdd('organization')}
            className="border border-dashed border-white/10 hover:border-[#CCA166]/40 p-4 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group min-h-[140px]"
          >
            <div className="size-10 rounded-full bg-white/5 group-hover:bg-[#CCA166]/15 text-white/40 group-hover:text-[#CCA166] flex items-center justify-center transition-colors mb-2">
              <Plus className="size-5" />
            </div>
            <p className="text-xs font-semibold text-white/70 group-hover:text-white">Register Another Hospital</p>
            <p className="text-[11px] text-white/30 mt-0.5">Add to network fleet</p>
          </motion.div>
        </div>
      </div>

      {/* ── Direct Quick Actions ──────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">One-Click Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Add Department',
              desc: 'Create a new clinical specialty unit',
              action: () => openQuickAdd('department'),
              icon: GitBranch,
              color: 'text-blue-400',
            },
            {
              label: 'Add Ward & Beds',
              desc: 'Configure inpatient care rooms',
              action: () => openQuickAdd('ward'),
              icon: BedDouble,
              color: 'text-purple-400',
            },
            {
              label: 'Onboard Doctor',
              desc: 'Register doctor credentials & PIN',
              action: () => openQuickAdd('doctor'),
              icon: Stethoscope,
              color: 'text-rose-400',
            },
            {
              label: 'Onboard Nurse',
              desc: 'Register licensed nursing personnel',
              action: () => openQuickAdd('nurse'),
              icon: UserCheck,
              color: 'text-cyan-400',
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              whileHover={{ y: -2 }}
              onClick={item.action}
              className="flex items-start gap-3.5 p-4 bg-[#1E1E21] hover:bg-[#252528] border border-white/5 hover:border-[#CCA166]/20 rounded-2xl cursor-pointer transition-all shadow-md group"
            >
              <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-[#CCA166]/15 text-[#CCA166] transition-colors shrink-0">
                <item.icon className={`size-4 ${item.color}`} />
              </div>
              <div>
                <p className="text-white font-semibold text-xs group-hover:text-[#CCA166] transition-colors">{item.label}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
