import React, { useState } from "react";
import {
  Heart, AlertTriangle, Activity, Thermometer, Droplets, Brain,
  Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Stethoscope,
  FileText, Shield, Zap, Wind, Eye
} from "lucide-react";

/* ─── tiny atoms ─── */
const SectionCard = ({ title, icon, color, children }) => (
  <div className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden">
    <div
      className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
      style={{ background: `linear-gradient(90deg, ${color}12 0%, transparent 55%)` }}
    >
      <span style={{ color }}>{icon}</span>
      <span className="text-white font-semibold text-sm">{title}</span>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Badge = ({ label, color = "#CCA166", bg }) => (
  <span
    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
    style={{ color, borderColor: `${color}40`, background: bg || `${color}15` }}
  >
    {label}
  </span>
);

const InfoRow = ({ label, value, accent }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-white/5 last:border-0">
    <span className="text-white/40 text-sm shrink-0">{label}</span>
    <span className="text-white text-sm font-medium text-right" style={accent ? { color: accent } : {}}>
      {value || "—"}
    </span>
  </div>
);

/* ─── Expandable condition card ─── */
const ConditionCard = ({ name, severity, since, notes }) => {
  const [open, setOpen] = useState(false);
  const severityColor =
    severity === "High" ? "#E54D4D" : severity === "Moderate" ? "#FFBB33" : "#2CD155";
  return (
    <div className="bg-[#1E1E20] rounded-xl border border-white/8 overflow-hidden transition-all duration-200">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-white/3 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <span
            className="size-2.5 rounded-full shrink-0 shadow-lg"
            style={{ background: severityColor, boxShadow: `0 0 6px ${severityColor}80` }}
          />
          <span className="text-white font-medium text-sm text-left">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label={severity} color={severityColor} />
          {open ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
          {since && <p className="text-xs text-white/40">Since: <span className="text-white/70">{since}</span></p>}
          {notes && <p className="text-xs text-white/60 leading-relaxed">{notes}</p>}
        </div>
      )}
    </div>
  );
};

/* ─── Vital baseline row ─── */
const VitalBaseline = ({ icon, label, normal, unit, color }) => (
  <div className="flex items-center gap-3 bg-[#1E1E20] rounded-xl px-4 py-3 border border-white/5">
    <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}18` }}>
      {React.cloneElement(icon, { size: 16, color })}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-white/40 mb-0.5">{label}</p>
      <p className="text-sm text-white font-semibold">
        {normal} <span className="text-white/40 font-normal text-xs">{unit}</span>
      </p>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ─── */
export default function MedicalInfoTab({ patientDetails }) {
  const p = patientDetails || {};

  const conditions = [
    { name: p.primary_diagnosis || p.diagnosis || "Hypertension", severity: "High", since: p.admission_date || "2024-01", notes: "Patient is on antihypertensive therapy. BP monitoring required every 4 hours." },
    { name: "Type 2 Diabetes", severity: "Moderate", since: "2021-06", notes: "HbA1c last checked 3 months ago. Insulin dosage adjusted recently." },
    { name: "Mild Anemia", severity: "Low", since: "2023-09", notes: "Iron supplements prescribed. Follow-up CBC in 4 weeks." },
  ];

  const allergies = (p.allergies || "Penicillin, Sulfa drugs, Latex").split(",").map((a) => a.trim()).filter(Boolean);

  const vitalBaselines = [
    { icon: <Heart />, label: "Heart Rate", normal: "60–100", unit: "bpm", color: "#E54D4D" },
    { icon: <Activity />, label: "Blood Pressure", normal: "120/80", unit: "mmHg", color: "#6C9BF5" },
    { icon: <Droplets />, label: "SpO2", normal: "95–100", unit: "%", color: "#8B5CF6" },
    { icon: <Thermometer />, label: "Temperature", normal: "36.1–37.2", unit: "°C", color: "#FFBB33" },
    { icon: <Wind />, label: "Resp. Rate", normal: "12–20", unit: "brpm", color: "#2CD155" },
    { icon: <Zap />, label: "HRV Score", normal: "50–100", unit: "ms", color: "#CCA166" },
  ];

  const labResults = [
    { test: "Complete Blood Count (CBC)", result: "WBC: 6.2 × 10³/μL", status: "Normal", date: "2026-06-20" },
    { test: "Blood Glucose (Fasting)", result: "126 mg/dL", status: "High", date: "2026-06-22" },
    { test: "HbA1c", result: "7.4%", status: "Moderate", date: "2026-06-15" },
    { test: "Serum Creatinine", result: "0.9 mg/dL", status: "Normal", date: "2026-06-20" },
    { test: "Potassium (K+)", result: "3.5 mEq/L", status: "Normal", date: "2026-06-20" },
    { test: "Hemoglobin", result: "11.2 g/dL", status: "Low", date: "2026-06-20" },
  ];

  const statusColor = { Normal: "#2CD155", High: "#E54D4D", Moderate: "#FFBB33", Low: "#6C9BF5" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[#E54D4D]/15 border border-[#E54D4D]/20 flex items-center justify-center">
          <Stethoscope size={18} color="#E54D4D" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg leading-none">Medical Information</h3>
          <p className="text-white/40 text-sm mt-0.5">Clinical summary & diagnostics</p>
        </div>
      </div>

      {/* Top 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Basic Medical Info */}
        <SectionCard title="Clinical Summary" icon={<FileText size={16} />} color="#6C9BF5">
          <InfoRow label="Primary Diagnosis" value={p.primary_diagnosis || p.diagnosis || "Hypertensive Crisis"} accent="#CCA166" />
          <InfoRow label="Blood Group" value={p.blood_group || p.blood_type || "O+"} />
          <InfoRow label="Height" value={p.height ? `${p.height} cm` : "172 cm"} />
          <InfoRow label="Weight" value={p.weight ? `${p.weight} kg` : "74 kg"} />
          <InfoRow label="BMI" value={
            p.height && p.weight
              ? `${(p.weight / ((p.height / 100) ** 2)).toFixed(1)} kg/m²`
              : "25.0 kg/m²"
          } />
          <InfoRow label="Admission Date" value={p.admission_date || p.admitted_at || "—"} />
          <InfoRow label="Attending Doctor" value={p.attending_doctor || p.doctor_name || "—"} />
        </SectionCard>

        {/* Allergies */}
        <SectionCard title="Allergies & Contraindications" icon={<AlertTriangle size={16} />} color="#E54D4D">
          {allergies.length === 0 ? (
            <div className="flex items-center gap-2 text-[#2CD155] text-sm py-2">
              <CheckCircle size={16} /> No known allergies
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {allergies.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E54D4D]/10 border border-[#E54D4D]/25 rounded-xl text-xs text-[#E54D4D] font-medium"
                >
                  <XCircle size={12} /> {a}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mb-2">Contraindications</p>
            <p className="text-sm text-white/60 leading-relaxed">
              {p.contraindications || "Avoid NSAIDs due to renal sensitivity. No Beta-blockers without cardiology consult."}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Chronic Conditions */}
      <SectionCard title="Chronic Conditions" icon={<Brain size={16} />} color="#8B5CF6">
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <ConditionCard key={i} {...c} />
          ))}
        </div>
      </SectionCard>

      {/* Vital Baselines */}
      <SectionCard title="Baseline Vitals Reference" icon={<Activity size={16} />} color="#2CD155">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {vitalBaselines.map((v) => (
            <VitalBaseline key={v.label} {...v} />
          ))}
        </div>
      </SectionCard>

      {/* Lab Results */}
      <SectionCard title="Recent Lab Results" icon={<Eye size={16} />} color="#FFBB33">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left text-xs text-white/30 uppercase tracking-wider font-semibold pb-3 pr-4">Test</th>
                <th className="text-left text-xs text-white/30 uppercase tracking-wider font-semibold pb-3 pr-4">Result</th>
                <th className="text-left text-xs text-white/30 uppercase tracking-wider font-semibold pb-3 pr-4">Status</th>
                <th className="text-left text-xs text-white/30 uppercase tracking-wider font-semibold pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {labResults.map((r, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 pr-4 text-white/80 font-medium">{r.test}</td>
                  <td className="py-3 pr-4 text-white/70">{r.result}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        color: statusColor[r.status] || "#CCA166",
                        background: `${statusColor[r.status] || "#CCA166"}18`,
                        border: `1px solid ${statusColor[r.status] || "#CCA166"}35`,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 text-white/40 text-xs">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Medical History */}
      {(p.medical_history || true) && (
        <SectionCard title="Medical History" icon={<Clock size={16} />} color="#CCA166">
          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
            {p.medical_history ||
              "Patient has a 5-year history of hypertension managed with amlodipine. Hospitalized in 2023 for acute hypertensive episode. Family history of cardiovascular disease (paternal). No prior surgical history. Social history: non-smoker, occasional alcohol use."}
          </p>
        </SectionCard>
      )}
    </div>
  );
}
