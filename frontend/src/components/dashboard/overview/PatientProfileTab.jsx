import React, { useState, useEffect } from "react";
import {
  User, Phone, MapPin, Calendar, Heart, Droplets, Activity,
  Weight, Ruler, Stethoscope, Building, BedDouble, Edit3, Save, X, CheckCircle, AlertCircle
} from "lucide-react";
import { patientService } from "@/services/patientService";

/* ─────────────────────────────────────────────────────────────
   Small reusable field atoms
──────────────────────────────────────────────────────────────── */
const InfoCard = ({ icon, label, value, accent = "#CCA166" }) => (
  <div className="bg-[#373739]/40 hover:bg-[#373739]/70 rounded-2xl p-4 border border-white/5 hover:border-[#CCA166]/20 transition-all duration-300 flex items-start gap-3 group">
    <div className="p-2.5 bg-[#222225] rounded-xl group-hover:bg-[#CCA166]/10 transition-colors duration-300 shrink-0 mt-0.5">
      {React.cloneElement(icon, { size: 18, color: accent })}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-sm md:text-base text-white font-medium break-words">{value || "—"}</p>
    </div>
  </div>
);

const EditField = ({ label, name, value, onChange, type = "text", options }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-white/40 uppercase tracking-wider font-semibold">{label}</label>
    {options ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-[#1E1E20] border border-white/10 focus:border-[#CCA166]/50 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
      >
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-[#1E1E20] border border-white/10 focus:border-[#CCA166]/50 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition-colors placeholder-white/20"
      />
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────── */
export default function PatientProfileTab({ patientDetails, patientId, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [formData, setFormData] = useState({});

  // Flatten patientDetails into a workable form object
  useEffect(() => {
    if (patientDetails) {
      setFormData({
        full_name: patientDetails.full_name || patientDetails.name || "",
        age: patientDetails.age || "",
        gender: patientDetails.gender || "",
        dob: patientDetails.dob || patientDetails.date_of_birth || "",
        phone: patientDetails.phone || patientDetails.phone_number || "",
        email: patientDetails.email || "",
        address: patientDetails.address || "",
        emergency_contact: patientDetails.emergency_contact || patientDetails.emergency_contact_name || "",
        emergency_phone: patientDetails.emergency_phone || patientDetails.emergency_contact_phone || "",
        blood_group: patientDetails.blood_group || patientDetails.blood_type || "",
        height: patientDetails.height || "",
        weight: patientDetails.weight || "",
        diagnosis: patientDetails.diagnosis || patientDetails.primary_diagnosis || "",
        allergies: patientDetails.allergies || "",
        ward_name: patientDetails.ward_name || patientDetails.ward_no || patientDetails.ward || "",
        room_no: patientDetails.room_no || patientDetails.room_name || patientDetails.room || "",
        bed: patientDetails.bed || "",
        admission_date: patientDetails.admission_date || patientDetails.admitted_at || "",
        attending_doctor: patientDetails.attending_doctor || patientDetails.doctor_name || "",
        medical_history: patientDetails.medical_history || "",
        current_medications: patientDetails.current_medications || "",
        patient_id: patientDetails.patient_id || patientDetails.patientId || patientId || "",
      });
    }
  }, [patientDetails, patientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await patientService.updatePatientProfile(patientId, formData);
      if (response.success) {
        setSaveStatus("success");
        setIsEditing(false);
        if (onUpdate) onUpdate(formData);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleCancel = () => {
    // Reset to original patientDetails
    if (patientDetails) {
      setFormData({
        full_name: patientDetails.full_name || patientDetails.name || "",
        age: patientDetails.age || "",
        gender: patientDetails.gender || "",
        dob: patientDetails.dob || patientDetails.date_of_birth || "",
        phone: patientDetails.phone || patientDetails.phone_number || "",
        email: patientDetails.email || "",
        address: patientDetails.address || "",
        emergency_contact: patientDetails.emergency_contact || patientDetails.emergency_contact_name || "",
        emergency_phone: patientDetails.emergency_phone || patientDetails.emergency_contact_phone || "",
        blood_group: patientDetails.blood_group || patientDetails.blood_type || "",
        height: patientDetails.height || "",
        weight: patientDetails.weight || "",
        diagnosis: patientDetails.diagnosis || patientDetails.primary_diagnosis || "",
        allergies: patientDetails.allergies || "",
        ward_name: patientDetails.ward_name || patientDetails.ward_no || patientDetails.ward || "",
        room_no: patientDetails.room_no || patientDetails.room_name || patientDetails.room || "",
        bed: patientDetails.bed || "",
        admission_date: patientDetails.admission_date || patientDetails.admitted_at || "",
        attending_doctor: patientDetails.attending_doctor || patientDetails.doctor_name || "",
        medical_history: patientDetails.medical_history || "",
        current_medications: patientDetails.current_medications || "",
        patient_id: patientDetails.patient_id || patientDetails.patientId || patientId || "",
      });
    }
    setIsEditing(false);
  };

  /* ── Sections ── */
  const sections = [
    {
      title: "Personal Information",
      icon: <User size={16} />,
      color: "#6C9BF5",
      fields: [
        { icon: <User />, label: "Full Name", key: "full_name" },
        { icon: <Calendar />, label: "Date of Birth", key: "dob" },
        { icon: <User />, label: "Age", key: "age" },
        { icon: <User />, label: "Gender", key: "gender" },
        { icon: <Phone />, label: "Phone Number", key: "phone" },
        { icon: <MapPin />, label: "Address", key: "address" },
      ],
    },
    {
      title: "Medical Details",
      icon: <Heart size={16} />,
      color: "#E54D4D",
      fields: [
        { icon: <Droplets />, label: "Blood Group", key: "blood_group" },
        { icon: <Ruler />, label: "Height (cm)", key: "height" },
        { icon: <Weight />, label: "Weight (kg)", key: "weight" },
        { icon: <Activity />, label: "Primary Diagnosis", key: "diagnosis" },
        { icon: <AlertCircle />, label: "Allergies", key: "allergies" },
        { icon: <Stethoscope />, label: "Current Medications", key: "current_medications" },
      ],
    },
    {
      title: "Admission Details",
      icon: <Building size={16} />,
      color: "#2CD155",
      fields: [
        { icon: <Building />, label: "Ward", key: "ward_name" },
        { icon: <BedDouble />, label: "Room / Bed No.", key: "room_no" },
        { icon: <Calendar />, label: "Admission Date", key: "admission_date" },
        { icon: <Stethoscope />, label: "Attending Doctor", key: "attending_doctor" },
      ],
    },
    {
      title: "Emergency Contact",
      icon: <Phone size={16} />,
      color: "#FFBB33",
      fields: [
        { icon: <User />, label: "Contact Name", key: "emergency_contact" },
        { icon: <Phone />, label: "Contact Phone", key: "emergency_phone" },
      ],
    },
  ];

  const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
  const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const editOptions = {
    gender: genderOptions,
    blood_group: bloodGroupOptions,
  };
  const dateFields = ["dob", "admission_date"];

  return (
    <div className="space-y-6 mt-1">
      {/* ── Header strip ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#CCA166]/15 border border-[#CCA166]/20 flex items-center justify-center">
            <User size={18} color="#CCA166" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg leading-none">Patient Profile</h3>
            <p className="text-white/40 text-sm mt-0.5">ID: {formData.patient_id || patientId || "—"}</p>
          </div>
        </div>

        {/* Save status badge */}
        <div className="flex items-center gap-3">
          {saveStatus === "success" && (
            <div className="flex items-center gap-2 text-[#2CD155] text-sm font-medium animate-fade-in">
              <CheckCircle size={16} /> Saved successfully
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 text-[#E54D4D] text-sm font-medium animate-fade-in">
              <AlertCircle size={16} /> Save failed, please retry
            </div>
          )}

          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/30 text-sm transition-colors"
              >
                <X size={15} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#CCA166] hover:bg-[#B28850] text-black font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {isSaving ? (
                  <span className="size-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block" />
                ) : (
                  <Save size={15} />
                )}
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white/5 hover:bg-[#CCA166]/15 border border-white/10 hover:border-[#CCA166]/40 text-white/80 hover:text-white text-sm transition-all duration-200"
            >
              <Edit3 size={15} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Section cards ── */}
      {isEditing ? (
        /* ─── EDIT MODE ─── */
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden"
            >
              {/* section header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
                style={{ background: `linear-gradient(90deg, ${section.color}10 0%, transparent 60%)` }}>
                <span style={{ color: section.color }}>{section.icon}</span>
                <span className="text-white font-medium text-sm">{section.title}</span>
              </div>

              {/* fields grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(({ key, label }) => (
                  <EditField
                    key={key}
                    label={label}
                    name={key}
                    value={formData[key] || ""}
                    onChange={handleChange}
                    type={dateFields.includes(key) ? "date" : "text"}
                    options={editOptions[key]}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Medical history — full width textarea */}
          <div className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
              style={{ background: "linear-gradient(90deg, #8B5CF610 0%, transparent 60%)" }}>
              <Activity size={16} color="#8B5CF6" />
              <span className="text-white font-medium text-sm">Medical History</span>
            </div>
            <div className="p-5">
              <textarea
                name="medical_history"
                value={formData.medical_history || ""}
                onChange={handleChange}
                rows={4}
                placeholder="Enter patient's medical history…"
                className="w-full bg-[#1E1E20] border border-white/10 focus:border-[#CCA166]/50 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-white/20 resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ─── VIEW MODE ─── */
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden"
            >
              {/* section header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
                style={{ background: `linear-gradient(90deg, ${section.color}10 0%, transparent 60%)` }}>
                <span style={{ color: section.color }}>{section.icon}</span>
                <span className="text-white font-medium text-sm">{section.title}</span>
              </div>

              {/* info cards grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {section.fields.map(({ icon, label, key }) => (
                  <InfoCard
                    key={key}
                    icon={icon}
                    label={label}
                    value={formData[key]}
                    accent={section.color}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Medical history */}
          {formData.medical_history && (
            <div className="bg-[#2A2A2C] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5"
                style={{ background: "linear-gradient(90deg, #8B5CF610 0%, transparent 60%)" }}>
                <Activity size={16} color="#8B5CF6" />
                <span className="text-white font-medium text-sm">Medical History</span>
              </div>
              <div className="p-5">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">{formData.medical_history}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
