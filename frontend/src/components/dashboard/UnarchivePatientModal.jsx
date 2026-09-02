import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Close2 } from "@/utilities/icons";
import apiClient from "@/config/apiClient";
import { patientService } from "@/services/patientService";

function FieldGroup({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white/70 font-medium flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full min-h-11 px-4 text-sm text-white bg-[#2a2a2e] border border-white/10 rounded-xl focus:outline-none focus:border-[#b2884d]/60 focus:ring-1 focus:ring-[#b2884d]/20 placeholder:text-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const selectCls = inputCls + " appearance-none cursor-pointer";

export default function UnarchivePatientModal({
  isOpen,
  onClose,
  patient,
  onSuccess,
}) {
  const [assignmentType, setAssignmentType] = useState("ward_bed");
  const [form, setForm] = useState({
    department_id: "",
    ward_id: "",
    bed_id: "",
    room_id: "",
    doctor_id: "",
    nurse_id: "",
    device_id: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setAssignmentType("ward_bed");
      setForm({
        department_id: "",
        ward_id: "",
        bed_id: "",
        room_id: "",
        doctor_id: "",
        nurse_id: "",
        device_id: "",
      });
      setErrors({});
      setSubmitError("");
      setSubmitting(false);
      setWards([]);
      setBeds([]);
      setRooms([]);
    }
  }, [isOpen]);

  // Fetch user organization profile if not present
  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get("/api/v1/auth/profile")
      .then((res) => {
        const data = res.data?.data || res.data;
        const id = data?.organization_id;
        if (id) setOrgId(id);
      })
      .catch((err) => {
        console.error("Failed to load user organization for unarchiving:", err);
      });
  }, [isOpen]);

  // Fetch departments, doctors, nurses when orgId is resolved
  useEffect(() => {
    if (!orgId || !isOpen) return;
    setLoadingDepts(true);
    Promise.all([
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/departments`),
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/doctors`),
      apiClient.get(`/api/v1/discovery/organizations/${orgId}/nurses`),
    ])
      .then(([deptRes, docRes, nurseRes]) => {
        setDepartments(deptRes.data || []);
        setDoctors(docRes.data || []);
        setNurses(nurseRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch discovery metadata:", err);
      })
      .finally(() => setLoadingDepts(false));
  }, [orgId, isOpen]);

  // Department change: fetch wards or rooms
  useEffect(() => {
    if (!form.department_id) {
      setWards([]);
      setBeds([]);
      setRooms([]);
      return;
    }

    setForm((f) => ({ ...f, ward_id: "", bed_id: "", room_id: "" }));

    if (assignmentType === "ward_bed") {
      setLoadingWards(true);
      apiClient
        .get(`/api/v1/discovery/departments/${form.department_id}/wards`)
        .then((r) => setWards(r.data || []))
        .catch(() => setWards([]))
        .finally(() => setLoadingWards(false));
    } else {
      setLoadingRooms(true);
      apiClient
        .get(`/api/v1/discovery/departments/${form.department_id}/rooms`)
        .then((r) => {
          const allRooms = r.data || [];
          const availableRooms = allRooms.filter(
            (room) => !room.is_occupied && (room.is_active ?? true)
          );
          setRooms(availableRooms);
        })
        .catch(() => setRooms([]))
        .finally(() => setLoadingRooms(false));
    }
  }, [form.department_id, assignmentType]);

  // Ward change: fetch beds
  useEffect(() => {
    if (assignmentType !== "ward_bed" || !form.ward_id) {
      setBeds([]);
      return;
    }
    setLoadingBeds(true);
    setForm((f) => ({ ...f, bed_id: "" }));
    apiClient
      .get(`/api/v1/discovery/wards/${form.ward_id}/beds`)
      .then((r) => setBeds(r.data || []))
      .catch(() => setBeds([]))
      .finally(() => setLoadingBeds(false));
  }, [form.ward_id, assignmentType]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  }, []);

  const handleAssignmentTypeChange = (type) => {
    setAssignmentType(type);
    setForm((prev) => ({ ...prev, ward_id: "", bed_id: "", room_id: "" }));
    setErrors((prev) => ({
      ...prev,
      ward_id: undefined,
      bed_id: undefined,
      room_id: undefined,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.department_id) {
      newErrors.department_id = "Please select a department";
    }
    if (assignmentType === "ward_bed") {
      if (!form.ward_id) newErrors.ward_id = "Please select a ward";
      if (!form.bed_id) newErrors.bed_id = "Please select a bed";
    } else {
      if (!form.room_id) newErrors.room_id = "Please select a room";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    if (!patient?.id && !patient?.userId) {
      setSubmitError("Patient ID is missing. Cannot unarchive.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        archived_patient_id: Number(patient.id || patient.userId),
        department_id: Number(form.department_id),
        assignment_type: assignmentType,
        ward_id:
          assignmentType === "ward_bed" && form.ward_id
            ? Number(form.ward_id)
            : null,
        room_id:
          assignmentType === "room" && form.room_id
            ? Number(form.room_id)
            : null,
        bed_id:
          assignmentType === "ward_bed" && form.bed_id
            ? Number(form.bed_id)
            : null,
        assigned_doctor: form.doctor_id ? Number(form.doctor_id) : null,
        doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
        nurse_id: form.nurse_id ? Number(form.nurse_id) : null,
        device_id: form.device_id?.trim() || null,
      };

      const response = await patientService.unarchivePatient(payload);

      if (response.success) {
        onSuccess && onSuccess(response.data);
        onClose();
      } else {
        setSubmitError(response.message || "Failed to unarchive patient.");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : err.response?.data?.message || err.message || "Failed to unarchive patient.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div
          className="fixed inset-0"
          onClick={() => !submitting && onClose()}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl my-auto bg-[#1a1a1e] rounded-3xl border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-white/5">
            <div>
              <h3 className="text-xl font-semibold text-white">Unarchive Patient</h3>
              <p className="text-sm text-white/50 mt-0.5">
                Assign location and care team to resume monitoring
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="size-9 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0 disabled:opacity-40"
              title="Close"
            >
              <Close2 className="size-4" />
            </button>
          </div>

          {/* Patient Context Banner */}
          <div className="px-6 pt-5">
            <div className="bg-[#b2884d]/10 border border-[#b2884d]/30 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#b2884d]/20 flex items-center justify-center text-[#cca166] shrink-0 text-lg border border-[#b2884d]/30">
                ↺
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-white truncate">
                    {patient?.name || "Patient"}
                  </p>
                  {patient?.uhid && (
                    <span className="text-xs font-mono bg-white/10 text-white/70 px-2 py-0.5 rounded-md">
                      UHID: {patient.uhid}
                    </span>
                  )}
                  {patient?.ward && patient.ward !== "-" && (
                    <span className="text-xs bg-[#b2884d]/20 text-[#cca166] px-2 py-0.5 rounded-md">
                      Last: {patient.ward}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Are you sure you want to unarchive this patient? This will reactivate the record and resume monitoring once a location is assigned.
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleConfirm} className="p-6 flex flex-col gap-5">
            {/* Submit Error Banner */}
            {submitError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Department */}
            <FieldGroup label="Department" required error={errors.department_id}>
              <div className="relative">
                <select
                  className={selectCls}
                  value={form.department_id}
                  onChange={(e) => setField("department_id", e.target.value)}
                  disabled={loadingDepts || submitting}
                >
                  <option value="">
                    {loadingDepts ? "Loading departments..." : "Select department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  ▼
                </div>
              </div>
            </FieldGroup>

            {/* Assignment Type Radio Selection */}
            {form.department_id && (
              <div className="flex gap-3">
                {[
                  {
                    value: "ward_bed",
                    label: "🛏 Ward & Bed",
                    desc: "Inpatient ward admission",
                  },
                  {
                    value: "room",
                    label: "🚪 Room",
                    desc: "Direct room assignment",
                  },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAssignmentTypeChange(value)}
                    disabled={submitting}
                    className={`flex-1 flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      assignmentType === value
                        ? "bg-[#b2884d]/15 border-[#b2884d]/60 text-white"
                        : "bg-white/3 border-white/10 text-white/50 hover:border-white/25"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        assignmentType === value
                          ? "border-[#cca166]"
                          : "border-white/30"
                      }`}
                    >
                      {assignmentType === value && (
                        <span className="w-2 h-2 rounded-full bg-[#cca166]" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Ward + Bed Flow */}
            {assignmentType === "ward_bed" && form.department_id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="Ward" required error={errors.ward_id}>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.ward_id}
                      onChange={(e) => setField("ward_id", e.target.value)}
                      disabled={!form.department_id || loadingWards || submitting}
                    >
                      <option value="">
                        {loadingWards ? "Loading wards..." : "Select ward"}
                      </option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                      ▼
                    </div>
                  </div>
                </FieldGroup>

                <FieldGroup label="Bed" required error={errors.bed_id}>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.bed_id}
                      onChange={(e) => setField("bed_id", e.target.value)}
                      disabled={!form.ward_id || loadingBeds || submitting}
                    >
                      <option value="">
                        {loadingBeds ? "Loading beds..." : "Select bed"}
                      </option>
                      {beds.length === 0 && form.ward_id && !loadingBeds ? (
                        <option disabled>No available beds</option>
                      ) : (
                        beds.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bed_no || `Bed ${b.id}`}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                      ▼
                    </div>
                  </div>
                </FieldGroup>
              </div>
            )}

            {/* Room-only Flow */}
            {assignmentType === "room" && form.department_id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup
                  label={`Room${
                    rooms.length > 0 && !loadingRooms
                      ? ` (${rooms.length} available)`
                      : ""
                  }`}
                  required
                  error={errors.room_id}
                >
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.room_id}
                      onChange={(e) => setField("room_id", e.target.value)}
                      disabled={loadingRooms || submitting}
                    >
                      <option value="">
                        {loadingRooms ? "Loading rooms..." : "Select room"}
                      </option>
                      {rooms.length === 0 && !loadingRooms ? (
                        <option disabled>
                          No available rooms in this department
                        </option>
                      ) : (
                        rooms.map((r) => {
                          const label = r.room_number
                            ? r.room_number.toLowerCase().startsWith("room")
                              ? r.room_number
                              : `Room ${r.room_number}`
                            : `Room ${r.id}`;
                          return (
                            <option key={r.id} value={r.id}>
                              {label}
                            </option>
                          );
                        })
                      )}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                      ▼
                    </div>
                  </div>
                </FieldGroup>
              </div>
            )}

            {/* Doctor / Nurse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Assign Doctor" error={errors.doctor_id}>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.doctor_id}
                    onChange={(e) => setField("doctor_id", e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Optional — select doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}
                        {d.is_on_call ? " (On-call)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                    ▼
                  </div>
                </div>
              </FieldGroup>

              <FieldGroup label="Assign Nurse" error={errors.nurse_id}>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.nurse_id}
                    onChange={(e) => setField("nurse_id", e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Optional — select nurse</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.full_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
                    ▼
                  </div>
                </div>
              </FieldGroup>
            </div>

            {/* Device / Hardware Band ID (Optional) */}
            <FieldGroup label="Hardware Device ID" error={errors.device_id}>
              <input
                type="text"
                className={inputCls}
                placeholder="Optional — e.g. VUE-BAND-001"
                value={form.device_id}
                onChange={(e) => setField("device_id", e.target.value)}
                disabled={submitting}
              />
            </FieldGroup>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b2884d] to-[#cca166] text-black text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(204,161,102,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Unarchiving...
                  </>
                ) : (
                  "Confirm Unarchive"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
