import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Close2 } from "@/utilities/icons";
import apiClient from "@/config/apiClient";

// ─── Tiny helpers ───────────────────────────────────────────────────────────

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];
const COMORBIDITIES_LIST = [
  "Diabetes",
  "Hypertension",
  "Chronic Kidney Disease",
  "Heart Disease",
  "COPD",
  "Asthma",
  "Obesity",
  "Cancer",
  "HIV/AIDS",
  "Liver Disease",
  "Stroke",
  "Epilepsy",
  "Thyroid Disorder",
  "Anemia",
  "Arthritis",
];

const STEPS = [
  { label: "Patient Info", icon: "👤" },
  { label: "Location", icon: "🏥" },
  { label: "Medical", icon: "🩺" },
  { label: "Access", icon: "🔐" },
];

function FieldGroup({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white/70 font-medium">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full min-h-11 px-4 text-sm text-white bg-[#2a2a2e] border border-white/10 rounded-xl focus:outline-none focus:border-[#b2884d]/60 focus:ring-1 focus:ring-[#b2884d]/20 placeholder:text-white/30 transition-all";

const selectCls = inputCls + " appearance-none cursor-pointer";

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-white/40 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-[#cca166]" : "text-white/80"}`}>{value}</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RegisterPatientModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [registeredPatient, setRegisteredPatient] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    alt_phone: "",
    age: "",
    gender: "",
    blood_group: "",
    height: "",
    weight: "",
    user_id: "",
    pin: "",
    pin_confirm: "",
    comorbidities: [],
    department_id: "",
    ward_id: "",
    bed_id: "",
    room_id: "",
    doctor_id: "",
    nurse_id: "",
  });

  const [errors, setErrors] = useState({});

  const [orgId, setOrgId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSubmitting(false);
      setSubmitError("");
      setSubmitSuccess(false);
      setRegisteredPatient(null);
      setErrors({});
      setForm({
        full_name: "", phone_number: "", alt_phone: "",
        age: "", gender: "", blood_group: "",
        height: "", weight: "", user_id: "",
        pin: "", pin_confirm: "", comorbidities: [],
        department_id: "", ward_id: "", bed_id: "", room_id: "",
        doctor_id: "", nurse_id: "",
      });
      setDepartments([]);
      setWards([]);
      setBeds([]);
      setRooms([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.get("/api/v1/auth/profile").then((res) => {
      const data = res.data?.data || res.data;
      const id = data?.organization_id;
      if (id) setOrgId(id);
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!orgId) return;
    setLoadingDepts(true);
    Promise.all([
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/departments`),
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/doctors`),
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/nurses`),
    ]).then(([deptRes, docRes, nurseRes]) => {
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
      setNurses(nurseRes.data || []);
    }).catch(() => {}).finally(() => setLoadingDepts(false));
  }, [orgId]);

  useEffect(() => {
    if (!form.department_id) { setWards([]); setBeds([]); return; }
    setLoadingWards(true);
    setForm((f) => ({ ...f, ward_id: "", bed_id: "" }));
    apiClient.get(`/api/v1/discovery/departments/${form.department_id}/wards`)
      .then((r) => setWards(r.data || []))
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [form.department_id]);

  useEffect(() => {
    if (!form.ward_id) { setBeds([]); setRooms([]); return; }
    setLoadingBeds(true);
    setLoadingRooms(true);
    setForm((f) => ({ ...f, bed_id: "", room_id: "" }));
    Promise.all([
      apiClient.get(`/api/v1/discovery/wards/${form.ward_id}/beds`),
      apiClient.get(`/api/v1/discovery/wards/${form.ward_id}/rooms`),
    ])
      .then(([bedsRes, roomsRes]) => {
        setBeds(bedsRes.data || []);
        setRooms(roomsRes.data || []);
      })
      .catch(() => { setBeds([]); setRooms([]); })
      .finally(() => { setLoadingBeds(false); setLoadingRooms(false); });
  }, [form.ward_id]);

  const set = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const toggleComorbidity = (item) => {
    setForm((f) => ({
      ...f,
      comorbidities: f.comorbidities.includes(item)
        ? f.comorbidities.filter((c) => c !== item)
        : [...f.comorbidities, item],
    }));
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 0) {
      if (!form.full_name.trim()) newErrors.full_name = "Full name is required";
      if (!form.phone_number.trim()) newErrors.phone_number = "Phone number is required";
      else if (!/^\+?\d{7,15}$/.test(form.phone_number.trim())) newErrors.phone_number = "Enter a valid phone number";
    }
    if (step === 1) {
      if (!form.department_id) newErrors.department_id = "Select a department";
      if (!form.ward_id) newErrors.ward_id = "Select a ward";
      if (!form.bed_id && !form.room_id) newErrors.bed_id = "Select a bed or a room";
    }
    if (step === 3) {
      if (!form.pin) newErrors.pin = "PIN is required";
      else if (!/^\d{6}$/.test(form.pin)) newErrors.pin = "PIN must be exactly 6 digits";
      if (form.pin !== form.pin_confirm) newErrors.pin_confirm = "PINs do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        pin: form.pin,
        ...(form.bed_id   && { bed_id:  parseInt(form.bed_id, 10) }),
        ...(form.room_id  && { room_id: parseInt(form.room_id, 10) }),
        ...(form.user_id.trim() && { user_id: form.user_id.trim() }),
        ...(form.alt_phone.trim() && { alt_phone: form.alt_phone.trim() }),
        ...(form.age && { age: parseInt(form.age, 10) }),
        ...(form.gender && { gender: form.gender }),
        ...(form.blood_group && { blood_group: form.blood_group }),
        ...(form.height && { height: parseFloat(form.height) }),
        ...(form.weight && { weight: parseFloat(form.weight) }),
        ...(form.doctor_id && { doctor_id: parseInt(form.doctor_id, 10) }),
        ...(form.nurse_id && { nurse_id: parseInt(form.nurse_id, 10) }),
        comorbidities: form.comorbidities,
      };

      const res = await apiClient.post("/api/v1/patients/admit", payload);
      setRegisteredPatient(res.data);
      setSubmitSuccess(true);
      onSuccess && onSuccess(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setSubmitError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : "Failed to register patient. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitSuccess && registeredPatient) {
    return (
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <button onClick={onClose} className="absolute inset-0" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 w-full max-w-md bg-[#1a1a1e] rounded-3xl border border-white/10 shadow-2xl p-8 flex flex-col items-center text-center"
            >
              <div className="size-20 rounded-full bg-[#09AA59]/15 flex items-center justify-center mb-5">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#09AA59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Patient Registered!</h3>
              <p className="text-white/50 text-sm mb-6">
                {registeredPatient.full_name} has been successfully admitted.
              </p>

              <div className="w-full bg-[#27272b] rounded-2xl p-5 mb-6 text-left space-y-3">
                <Row label="Patient ID" value={registeredPatient.user_id} highlight />
                <Row label="Name" value={registeredPatient.full_name} />
                {registeredPatient.phone_number && <Row label="Phone" value={registeredPatient.phone_number} />}
              </div>
              <p className="text-xs text-white/30 mb-6">
                Please note the Patient ID — the patient uses it with their PIN to log in.
              </p>

              <button
                onClick={onClose}
                className="w-full min-h-12 rounded-xl bg-[linear-gradient(94.82deg,#b2884d_0%,#cca166_49%,#b2884d_99%)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 overflow-y-auto">
          <button onClick={onClose} className="absolute inset-0" />
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-2xl my-auto bg-[#1a1a1e] rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Register New Patient</h3>
                <p className="text-sm text-white/40 mt-0.5">Admit a patient and assign a bed</p>
              </div>
              <button
                onClick={onClose}
                className="size-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
              >
                <Close2 className="size-4" />
              </button>
            </div>

            {/* Step progress */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <React.Fragment key={i}>
                    <button
                      onClick={() => i < step && setStep(i)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
                        i === step
                          ? "bg-[#b2884d]/20 text-[#cca166]"
                          : i < step
                          ? "text-[#09AA59] cursor-pointer hover:bg-white/5"
                          : "text-white/30 cursor-default"
                      }`}
                    >
                      <span>{i < step ? "✓" : s.icon}</span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-1 ${i < step ? "bg-[#09AA59]/40" : "bg-white/10"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="h-0.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                <motion.div
                  className="h-full bg-[linear-gradient(90deg,#b2884d,#cca166)]"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            {/* Content */}
            <div className="p-6 min-h-[340px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Step 0 – Patient Info */}
                  {step === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldGroup label="Full Name" required error={errors.full_name}>
                        <input
                          className={inputCls}
                          placeholder="e.g. John Smith"
                          value={form.full_name}
                          onChange={(e) => set("full_name", e.target.value)}
                        />
                      </FieldGroup>
                      <FieldGroup label="Patient ID" error={errors.user_id}>
                        <input
                          className={inputCls}
                          placeholder="Auto-assigned if left blank"
                          value={form.user_id}
                          onChange={(e) => set("user_id", e.target.value)}
                        />
                      </FieldGroup>
                      <FieldGroup label="Phone Number" required error={errors.phone_number}>
                        <input
                          className={inputCls}
                          placeholder="+91 98765 43210"
                          value={form.phone_number}
                          onChange={(e) => set("phone_number", e.target.value)}
                        />
                      </FieldGroup>
                      <FieldGroup label="Alternate Phone" error={errors.alt_phone}>
                        <input
                          className={inputCls}
                          placeholder="Optional"
                          value={form.alt_phone}
                          onChange={(e) => set("alt_phone", e.target.value)}
                        />
                      </FieldGroup>
                      <FieldGroup label="Age" error={errors.age}>
                        <input
                          className={inputCls}
                          type="number"
                          placeholder="Years"
                          min={0}
                          max={150}
                          value={form.age}
                          onChange={(e) => set("age", e.target.value)}
                        />
                      </FieldGroup>
                      <FieldGroup label="Gender" error={errors.gender}>
                        <select className={selectCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                          <option value="">Select gender</option>
                          {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </FieldGroup>
                    </div>
                  )}

                  {/* Step 1 – Location */}
                  {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldGroup label="Department" required error={errors.department_id}>
                        <select
                          className={selectCls}
                          value={form.department_id}
                          onChange={(e) => set("department_id", e.target.value)}
                          disabled={loadingDepts}
                        >
                          <option value="">{loadingDepts ? "Loading..." : "Select department"}</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Ward" required error={errors.ward_id}>
                        <select
                          className={selectCls}
                          value={form.ward_id}
                          onChange={(e) => set("ward_id", e.target.value)}
                          disabled={!form.department_id || loadingWards}
                        >
                          <option value="">{loadingWards ? "Loading..." : "Select ward"}</option>
                          {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Bed" error={errors.bed_id}>
                        <select
                          className={selectCls}
                          value={form.bed_id}
                          onChange={(e) => {
                            set("bed_id", e.target.value);
                            if (e.target.value) set("room_id", ""); // mutual exclusion
                          }}
                          disabled={!form.ward_id || loadingBeds}
                        >
                          <option value="">{loadingBeds ? "Loading..." : "Select bed (optional)"}</option>
                          {beds.length === 0 && form.ward_id && !loadingBeds
                            ? <option disabled>No available beds</option>
                            : beds.map((b) => <option key={b.id} value={b.id}>{b.bed_no || `Bed ${b.id}`}</option>)
                          }
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Room" error={!form.bed_id ? errors.bed_id : undefined}>
                        <select
                          className={selectCls}
                          value={form.room_id}
                          onChange={(e) => {
                            set("room_id", e.target.value);
                            if (e.target.value) set("bed_id", ""); // mutual exclusion
                          }}
                          disabled={!form.ward_id || loadingRooms}
                        >
                          <option value="">{loadingRooms ? "Loading..." : "Select room (optional)"}</option>
                          {rooms.length === 0 && form.ward_id && !loadingRooms
                            ? <option disabled>No available rooms</option>
                            : rooms.map((r) => <option key={r.id} value={r.id}>{r.room_number || `Room ${r.id}`}</option>)
                          }
                        </select>
                      </FieldGroup>
                      {!form.bed_id && !form.room_id && form.ward_id && (
                        <p className="col-span-2 text-xs text-amber-400/80">⚠ Select either a Bed or a Room to proceed.</p>
                      )}
                      <FieldGroup label="Assign Doctor" error={errors.doctor_id}>
                        <select className={selectCls} value={form.doctor_id} onChange={(e) => set("doctor_id", e.target.value)}>
                          <option value="">Optional — select doctor</option>
                          {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.full_name}{d.is_on_call ? " (On-call)" : ""}
                            </option>
                          ))}
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Assign Nurse" error={errors.nurse_id}>
                        <select className={selectCls} value={form.nurse_id} onChange={(e) => set("nurse_id", e.target.value)}>
                          <option value="">Optional — select nurse</option>
                          {nurses.map((n) => (
                            <option key={n.id} value={n.id}>{n.full_name}</option>
                          ))}
                        </select>
                      </FieldGroup>
                    </div>
                  )}

                  {/* Step 2 – Medical */}
                  {step === 2 && (
                    <div className="flex flex-col gap-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FieldGroup label="Blood Group" error={errors.blood_group}>
                          <select className={selectCls} value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)}>
                            <option value="">Select</option>
                            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                          </select>
                        </FieldGroup>
                        <FieldGroup label="Height (cm)" error={errors.height}>
                          <input className={inputCls} type="number" placeholder="170" value={form.height} onChange={(e) => set("height", e.target.value)} />
                        </FieldGroup>
                        <FieldGroup label="Weight (kg)" error={errors.weight}>
                          <input className={inputCls} type="number" placeholder="70" value={form.weight} onChange={(e) => set("weight", e.target.value)} />
                        </FieldGroup>
                      </div>
                      <div>
                        <p className="text-sm text-white/70 font-medium mb-3">Comorbidities <span className="text-white/30 font-normal">(select all that apply)</span></p>
                        <div className="flex flex-wrap gap-2">
                          {COMORBIDITIES_LIST.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleComorbidity(item)}
                              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                                form.comorbidities.includes(item)
                                  ? "bg-[#b2884d]/20 border-[#b2884d]/60 text-[#cca166]"
                                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/25"
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3 – Access PIN + Summary */}
                  {step === 3 && (
                    <div className="flex flex-col gap-5">
                      <div className="bg-[#b2884d]/10 border border-[#b2884d]/25 rounded-2xl p-4 flex gap-3">
                        <span className="text-xl shrink-0">🔐</span>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Set a 6-digit Login PIN</p>
                          <p className="text-xs text-white/50">
                            The patient will use their Patient ID + this PIN to access the patient app.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldGroup label="PIN (6 digits)" required error={errors.pin}>
                          <input
                            className={inputCls}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="••••••"
                            value={form.pin}
                            onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </FieldGroup>
                        <FieldGroup label="Confirm PIN" required error={errors.pin_confirm}>
                          <input
                            className={inputCls}
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="••••••"
                            value={form.pin_confirm}
                            onChange={(e) => set("pin_confirm", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </FieldGroup>
                      </div>
                      <div className="bg-[#27272b] rounded-2xl p-4 space-y-2.5">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Registration Summary</p>
                        <Row label="Name" value={form.full_name || "—"} />
                        <Row label="Phone" value={form.phone_number || "—"} />
                        {form.age && <Row label="Age" value={`${form.age} yrs`} />}
                        {form.gender && <Row label="Gender" value={form.gender} />}
                        {form.blood_group && <Row label="Blood Group" value={form.blood_group} />}
                        {form.comorbidities.length > 0 && (
                          <Row label="Comorbidities" value={form.comorbidities.join(", ")} />
                        )}
                        <div className="h-px bg-white/5 my-1" />
                        {departments.find(d => d.id == form.department_id) && (
                          <Row label="Department" value={departments.find(d => d.id == form.department_id)?.name} />
                        )}
                        {wards.find(w => w.id == form.ward_id) && (
                          <Row label="Ward" value={wards.find(w => w.id == form.ward_id)?.name} />
                        )}
                        {beds.find(b => b.id == form.bed_id) && (
                          <Row label="Bed" value={beds.find(b => b.id == form.bed_id)?.bed_no || `Bed ${form.bed_id}`} />
                        )}
                        {rooms.find(r => r.id == form.room_id) && (
                          <Row label="Room" value={rooms.find(r => r.id == form.room_id)?.room_number || `Room ${form.room_id}`} />
                        )}
                      </div>
                      {submitError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                          {submitError}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between gap-4">
              <button
                onClick={step === 0 ? onClose : back}
                className="min-h-11 px-6 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
              >
                {step === 0 ? "Cancel" : "← Back"}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  className="min-h-11 px-8 rounded-xl bg-[linear-gradient(94.82deg,#b2884d_0%,#cca166_49%,#b2884d_99%)] text-white font-medium hover:opacity-90 transition-opacity text-sm"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`min-h-11 px-8 rounded-xl bg-[linear-gradient(94.82deg,#b2884d_0%,#cca166_49%,#b2884d_99%)] text-white font-medium transition-all text-sm flex items-center gap-2 ${submitting ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
                >
                  {submitting && (
                    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {submitting ? "Registering..." : "Register Patient"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
