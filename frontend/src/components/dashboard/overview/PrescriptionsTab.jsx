import React, { useState } from "react";
import {
  Pill, Plus, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, User, RefreshCw, ChevronDown, ChevronUp,
  Search, Filter, Stethoscope, Info
} from "lucide-react";

/* ─── Helpers ─── */
const statusConfig = {
  Active:      { color: "#2CD155", bg: "#2CD15518", border: "#2CD15535", icon: <CheckCircle size={12} /> },
  Completed:   { color: "#6C9BF5", bg: "#6C9BF518", border: "#6C9BF535", icon: <CheckCircle size={12} /> },
  Discontinued:{ color: "#E54D4D", bg: "#E54D4D18", border: "#E54D4D35", icon: <XCircle size={12} /> },
  "On Hold":   { color: "#FFBB33", bg: "#FFBB3318", border: "#FFBB3335", icon: <AlertCircle size={12} /> },
};
const frequencyColor = {
  "Once daily": "#6C9BF5",
  "Twice daily": "#CCA166",
  "Thrice daily": "#FFBB33",
  "As needed": "#8B5CF6",
  "Once weekly": "#2CD155",
};

/* ─── Dosage progress pill ─── */
const DosagePill = ({ dose, unit, frequency }) => {
  const col = frequencyColor[frequency] || "#CCA166";
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
      style={{ background: `${col}15`, border: `1px solid ${col}30`, color: col }}
    >
      <Pill size={12} /> {dose} {unit} · {frequency}
    </div>
  );
};

/* ─── Individual Prescription Card ─── */
const PrescriptionCard = ({ rx }) => {
  const [expanded, setExpanded] = useState(false);
  const sc = statusConfig[rx.status] || statusConfig["Active"];

  return (
    <div
      className="bg-[#2A2A2C] border border-white/5 rounded-2xl overflow-hidden transition-all duration-200"
      style={{ borderLeftWidth: "3px", borderLeftColor: sc.color }}
    >
      {/* Header row */}
      <button
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Icon */}
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${sc.color}15`, border: `1px solid ${sc.color}30` }}
        >
          <Pill size={16} style={{ color: sc.color }} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-white font-semibold text-sm">{rx.name}</p>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
            >
              {sc.icon} {rx.status}
            </span>
          </div>
          <DosagePill dose={rx.dose} unit={rx.unit} frequency={rx.frequency} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-white/35">
            <span className="flex items-center gap-1"><User size={11} /> {rx.prescribedBy}</span>
            <span className="flex items-center gap-1"><Calendar size={11} /> Started {rx.startDate}</span>
            {rx.endDate && <span className="flex items-center gap-1"><Clock size={11} /> Until {rx.endDate}</span>}
          </div>
        </div>

        <span className="text-white/30 shrink-0 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-4 bg-[#222224]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-2">Drug Details</p>
              <div className="space-y-1.5">
                <p className="text-xs text-white/60">Generic: <span className="text-white/80">{rx.generic || rx.name}</span></p>
                <p className="text-xs text-white/60">Category: <span className="text-white/80">{rx.category || "—"}</span></p>
                <p className="text-xs text-white/60">Route: <span className="text-white/80">{rx.route || "Oral"}</span></p>
                <p className="text-xs text-white/60">Duration: <span className="text-white/80">{rx.duration || "Ongoing"}</span></p>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-2">Instructions</p>
              <p className="text-xs text-white/60 leading-relaxed">{rx.instructions || "Take as directed by physician. Do not skip doses."}</p>
              {rx.sideEffects && (
                <div className="mt-2">
                  <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-1">Watch For</p>
                  <p className="text-xs text-[#FFBB33]/80">{rx.sideEffects}</p>
                </div>
              )}
            </div>
          </div>
          {rx.refillsLeft !== undefined && (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <RefreshCw size={12} />
              <span>Refills remaining: <strong className="text-white/80">{rx.refillsLeft}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Medication timeline dot ─── */
const TimelineDot = ({ time, meds }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center shrink-0">
      <div className="size-3 rounded-full bg-[#CCA166] shadow-[0_0_8px_#CCA16680]" />
      <div className="w-px flex-1 min-h-[24px] bg-white/10 mt-1" />
    </div>
    <div className="pb-4 -mt-0.5">
      <p className="text-xs font-bold text-[#CCA166] mb-1.5">{time}</p>
      <div className="flex flex-wrap gap-2">
        {meds.map((m) => (
          <span key={m} className="text-xs px-2.5 py-1 bg-[#CCA166]/10 border border-[#CCA166]/20 text-[#CCA166]/90 rounded-lg">
            {m}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* ─── MAIN ─── */
export default function PrescriptionsTab({ patientId, patientDetails }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const prescriptions = [
    {
      id: 1, name: "Amlodipine", generic: "Amlodipine Besylate", dose: "10", unit: "mg",
      frequency: "Once daily", status: "Active", category: "Calcium Channel Blocker",
      route: "Oral", prescribedBy: "Dr. George Thomas", startDate: "2026-01-15",
      duration: "Long-term", refillsLeft: 3,
      instructions: "Take in the morning with or without food. Do not crush or chew.",
      sideEffects: "Monitor for ankle swelling, flushing, or palpitations.",
    },
    {
      id: 2, name: "Metformin", generic: "Metformin HCl", dose: "500", unit: "mg",
      frequency: "Twice daily", status: "Active", category: "Biguanide (Anti-diabetic)",
      route: "Oral", prescribedBy: "Dr. George Thomas", startDate: "2025-06-10",
      duration: "Long-term", refillsLeft: 2,
      instructions: "Take with meals to reduce GI side effects. Monitor blood glucose regularly.",
      sideEffects: "Watch for lactic acidosis signs: muscle pain, weakness, nausea.",
    },
    {
      id: 3, name: "Atorvastatin", generic: "Atorvastatin Calcium", dose: "40", unit: "mg",
      frequency: "Once daily", status: "Active", category: "Statin (Lipid-lowering)",
      route: "Oral", prescribedBy: "Dr. Anita Sharma", startDate: "2025-09-01",
      duration: "Long-term", refillsLeft: 5,
      instructions: "Take at bedtime. Avoid grapefruit juice.",
      sideEffects: "Report muscle pain or weakness immediately.",
    },
    {
      id: 4, name: "Aspirin", generic: "Acetylsalicylic Acid", dose: "75", unit: "mg",
      frequency: "Once daily", status: "Active", category: "Antiplatelet",
      route: "Oral", prescribedBy: "Dr. George Thomas", startDate: "2026-01-15",
      duration: "Long-term", refillsLeft: 6,
      instructions: "Take after food. Avoid on empty stomach to prevent gastric irritation.",
      sideEffects: "GI bleeding risk. Report black stools or unusual bruising.",
    },
    {
      id: 5, name: "Omeprazole", generic: "Omeprazole", dose: "20", unit: "mg",
      frequency: "Once daily", status: "Active", category: "Proton Pump Inhibitor",
      route: "Oral", prescribedBy: "Dr. George Thomas", startDate: "2026-01-15",
      endDate: "2026-03-15", duration: "2 months", refillsLeft: 0,
      instructions: "Take 30 minutes before breakfast.",
    },
    {
      id: 6, name: "Amoxicillin", dose: "500", unit: "mg", frequency: "Thrice daily",
      status: "Completed", category: "Antibiotic (Penicillin)",
      route: "Oral", prescribedBy: "Dr. Anita Sharma", startDate: "2026-05-01", endDate: "2026-05-10",
      duration: "10 days", refillsLeft: 0,
      instructions: "Complete the full course even if feeling better.",
    },
    {
      id: 7, name: "Losartan", dose: "50", unit: "mg", frequency: "Once daily",
      status: "On Hold", category: "ARB (Anti-hypertensive)",
      route: "Oral", prescribedBy: "Dr. George Thomas", startDate: "2025-11-01",
      duration: "Pending review", refillsLeft: 1,
      instructions: "On hold pending renal function test results.",
      sideEffects: "Monitor potassium levels. Risk of hyperkalemia.",
    },
  ];

  const statusFilters = ["All", "Active", "Completed", "Discontinued", "On Hold"];

  const filtered = prescriptions.filter((rx) => {
    const matchStatus = statusFilter === "All" || rx.status === statusFilter;
    const matchSearch = rx.name.toLowerCase().includes(search.toLowerCase()) ||
      (rx.generic || "").toLowerCase().includes(search.toLowerCase()) ||
      (rx.category || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const activeCount = prescriptions.filter((r) => r.status === "Active").length;

  const scheduleMap = {
    "Morning (8 AM)": prescriptions.filter((r) => r.status === "Active" && ["Once daily", "Twice daily", "Thrice daily"].includes(r.frequency)).map((r) => `${r.name} ${r.dose}${r.unit}`),
    "Afternoon (1 PM)": prescriptions.filter((r) => r.status === "Active" && ["Thrice daily"].includes(r.frequency)).map((r) => `${r.name} ${r.dose}${r.unit}`),
    "Evening (6 PM)": prescriptions.filter((r) => r.status === "Active" && ["Twice daily", "Thrice daily"].includes(r.frequency)).map((r) => `${r.name} ${r.dose}${r.unit}`),
    "Bedtime (10 PM)": prescriptions.filter((r) => r.status === "Active" && r.name === "Atorvastatin").map((r) => `${r.name} ${r.dose}${r.unit}`),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 flex items-center justify-center">
            <Pill size={18} color="#8B5CF6" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg leading-none">Prescriptions</h3>
            <p className="text-white/40 text-sm mt-0.5">{activeCount} active medications</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/25 text-[#8B5CF6] text-sm font-medium transition-colors">
          <Plus size={15} /> Add Prescription
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", count: prescriptions.filter((r) => r.status === "Active").length, color: "#2CD155" },
          { label: "Completed", count: prescriptions.filter((r) => r.status === "Completed").length, color: "#6C9BF5" },
          { label: "On Hold", count: prescriptions.filter((r) => r.status === "On Hold").length, color: "#FFBB33" },
          { label: "Discontinued", count: prescriptions.filter((r) => r.status === "Discontinued").length, color: "#E54D4D" },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-[#2A2A2C] rounded-2xl px-4 py-4 border border-white/5 flex flex-col gap-1">
            <p className="text-2xl font-bold" style={{ color }}>{count}</p>
            <p className="text-xs text-white/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Daily Schedule */}
      <div className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
          style={{ background: "linear-gradient(90deg, #CCA16612 0%, transparent 55%)" }}>
          <Clock size={16} color="#CCA166" />
          <span className="text-white font-semibold text-sm">Today's Medication Schedule</span>
        </div>
        <div className="p-5">
          <div className="space-y-0">
            {Object.entries(scheduleMap)
              .filter(([, meds]) => meds.length > 0)
              .map(([time, meds]) => (
                <TimelineDot key={time} time={time} meds={meds} />
              ))}
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, generic, or category…"
            className="w-full bg-[#2A2A2C] border border-white/10 focus:border-[#CCA166]/40 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors placeholder-white/25"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                statusFilter === f
                  ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Pill size={40} className="mx-auto mb-3 opacity-30" />
            <p>No prescriptions match your search.</p>
          </div>
        ) : (
          filtered.map((rx) => <PrescriptionCard key={rx.id} rx={rx} />)
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#FFBB33]/8 border border-[#FFBB33]/20 rounded-xl">
        <Info size={14} className="text-[#FFBB33] shrink-0 mt-0.5" />
        <p className="text-xs text-[#FFBB33]/80 leading-relaxed">
          Prescription data is for clinical reference only. Always verify against the official patient chart before administering medications.
        </p>
      </div>
    </div>
  );
}
