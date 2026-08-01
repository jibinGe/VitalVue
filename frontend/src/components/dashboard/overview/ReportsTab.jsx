import React, { useState } from "react";
import {
  FileText, Download, Upload, Eye, Calendar, CheckCircle,
  Clock, XCircle, Filter, ChevronRight, Image, BarChart2,
  Microscope, Waves, AlertCircle, Plus
} from "lucide-react";

/* ─── Helpers ─── */
const typeIcon = (type) => {
  switch (type) {
    case "Lab": return <Microscope size={15} />;
    case "Imaging": return <Image size={15} />;
    case "ECG": return <Waves size={15} />;
    case "Pathology": return <BarChart2 size={15} />;
    default: return <FileText size={15} />;
  }
};
const typeColor = {
  Lab: "#6C9BF5",
  Imaging: "#8B5CF6",
  ECG: "#E54D4D",
  Pathology: "#FFBB33",
  Report: "#2CD155",
};
const statusConfig = {
  Available: { color: "#2CD155", icon: <CheckCircle size={13} /> },
  Pending: { color: "#FFBB33", icon: <Clock size={13} /> },
  Urgent: { color: "#E54D4D", icon: <AlertCircle size={13} /> },
  Processing: { color: "#6C9BF5", icon: <Clock size={13} /> },
};

/* ─── Big Report Card ─── */
const ReportCard = ({ report, onView }) => {
  const sc = statusConfig[report.status] || statusConfig["Available"];
  const col = typeColor[report.type] || "#CCA166";
  return (
    <div className="group bg-[#2A2A2C] hover:bg-[#303033] border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-200 flex gap-4 items-start">
      {/* Type icon pill */}
      <div
        className="size-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${col}18`, border: `1px solid ${col}30` }}
      >
        <span style={{ color: col }}>{typeIcon(report.type)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-white font-medium text-sm leading-snug">{report.name}</p>
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
            style={{
              color: sc.color,
              background: `${sc.color}18`,
              border: `1px solid ${sc.color}35`,
            }}
          >
            {sc.icon} {report.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
          <span
            className="text-xs px-2 py-0.5 rounded-md font-semibold"
            style={{ color: col, background: `${col}15` }}
          >
            {report.type}
          </span>
          <span className="text-xs text-white/35 flex items-center gap-1">
            <Calendar size={11} /> {report.date}
          </span>
          <span className="text-xs text-white/35">{report.lab || report.facility || "VitalVue Diagnostics"}</span>
        </div>
        {report.notes && (
          <p className="text-xs text-white/40 mt-2 leading-relaxed line-clamp-2">{report.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 shrink-0">
        <button
          onClick={() => onView && onView(report)}
          className="size-8 rounded-lg bg-white/5 hover:bg-[#6C9BF5]/15 flex items-center justify-center transition-colors group-hover:border-white/10 border border-white/5"
          title="View"
        >
          <Eye size={14} className="text-white/50 hover:text-[#6C9BF5]" />
        </button>
        <button
          className="size-8 rounded-lg bg-white/5 hover:bg-[#2CD155]/15 flex items-center justify-center transition-colors border border-white/5"
          title="Download"
        >
          <Download size={14} className="text-white/50 hover:text-[#2CD155]" />
        </button>
      </div>
    </div>
  );
};

/* ─── Upload zone ─── */
const UploadZone = () => (
  <div className="border-2 border-dashed border-white/10 hover:border-[#CCA166]/40 rounded-2xl p-6 text-center transition-colors duration-200 cursor-pointer group">
    <div className="size-12 rounded-xl bg-[#CCA166]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#CCA166]/20 transition-colors">
      <Upload size={20} color="#CCA166" />
    </div>
    <p className="text-white/70 text-sm font-medium">Upload New Report</p>
    <p className="text-white/30 text-xs mt-1">PDF, JPEG, PNG — max 20 MB</p>
  </div>
);

/* ─── MAIN ─── */
export default function ReportsTab({ patientId, patientDetails }) {
  const [activeFilter, setActiveFilter] = useState("All");

  const allReports = [
    { id: 1, name: "Complete Blood Count (CBC)", type: "Lab", status: "Available", date: "2026-06-22", lab: "Central Lab", notes: "WBC elevated slightly. Hemoglobin low at 11.2 g/dL. Recommend follow-up in 4 weeks." },
    { id: 2, name: "Chest X-Ray", type: "Imaging", status: "Available", date: "2026-06-20", facility: "Radiology Dept.", notes: "No acute cardiopulmonary process. Mild cardiomegaly noted." },
    { id: 3, name: "12-Lead ECG", type: "ECG", status: "Available", date: "2026-06-21", facility: "Cardiology Unit", notes: "Sinus rhythm with HR 88 bpm. No ST segment changes." },
    { id: 4, name: "HbA1c Test", type: "Lab", status: "Available", date: "2026-06-15", lab: "Central Lab", notes: "HbA1c 7.4% — above target. Medication adjustment recommended." },
    { id: 5, name: "Renal Function Panel", type: "Pathology", status: "Pending", date: "2026-06-28", lab: "Nephrology Lab", notes: null },
    { id: 6, name: "CT Brain (Non-contrast)", type: "Imaging", status: "Processing", date: "2026-06-27", facility: "Radiology Dept.", notes: null },
    { id: 7, name: "Lipid Panel", type: "Lab", status: "Urgent", date: "2026-06-29", lab: "Central Lab", notes: "LDL critically elevated. Statin therapy reassessment needed." },
    { id: 8, name: "Urine Culture & Sensitivity", type: "Pathology", status: "Pending", date: "2026-06-29", lab: "Microbiology Lab", notes: null },
  ];

  const filters = ["All", "Lab", "Imaging", "ECG", "Pathology"];
  const filtered = activeFilter === "All" ? allReports : allReports.filter((r) => r.type === activeFilter);

  const stats = {
    total: allReports.length,
    available: allReports.filter((r) => r.status === "Available").length,
    pending: allReports.filter((r) => r.status === "Pending" || r.status === "Processing").length,
    urgent: allReports.filter((r) => r.status === "Urgent").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#6C9BF5]/15 border border-[#6C9BF5]/20 flex items-center justify-center">
            <FileText size={18} color="#6C9BF5" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg leading-none">Medical Reports</h3>
            <p className="text-white/40 text-sm mt-0.5">Lab tests, imaging & diagnostics</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#CCA166]/15 hover:bg-[#CCA166]/25 border border-[#CCA166]/25 text-[#CCA166] text-sm font-medium transition-colors">
          <Plus size={15} /> Upload Report
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Reports", value: stats.total, color: "#CCA166" },
          { label: "Available", value: stats.available, color: "#2CD155" },
          { label: "Pending / Processing", value: stats.pending, color: "#6C9BF5" },
          { label: "Urgent", value: stats.urgent, color: "#E54D4D" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[#2A2A2C] rounded-2xl px-4 py-4 border border-white/5 flex flex-col gap-1"
          >
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-white/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-white/30" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 border ${
              activeFilter === f
                ? "bg-[#CCA166] border-[#CCA166] text-black"
                : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/25"
            }`}
          >
            {f}
            {f !== "All" && (
              <span className="ml-1.5 opacity-60">({allReports.filter((r) => r.type === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No reports found for this filter.</p>
          </div>
        ) : (
          filtered.map((r) => <ReportCard key={r.id} report={r} />)
        )}
      </div>

      {/* Upload zone */}
      <UploadZone />
    </div>
  );
}
