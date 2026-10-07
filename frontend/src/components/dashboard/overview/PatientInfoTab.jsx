import {
  BedDouble,
  Building2,
  Calendar,
  Droplets,
  IdCard,
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";

function Field({ icon: Icon, label, value, accent = "#CCA166" }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3.5 flex items-start gap-3">
      <span
        className="size-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-white/40 font-medium">{label}</div>
        <div className="text-sm md:text-base text-white font-medium mt-0.5 break-words">{value || "—"}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-[20px] bg-[#2f2f31] border border-white/5 p-4 md:p-5">
      <h4 className="text-sm text-white/70 mb-3">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

export default function PatientInfoTab({ patientDetails, statePatient, userId }) {
  const name =
    patientDetails?.full_name ||
    statePatient?.patientName ||
    patientDetails?.name ||
    "—";
  const initials = String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "VV";

  const id =
    patientDetails?.user_id ||
    statePatient?.patientId ||
    patientDetails?.patient_id ||
    patientDetails?.patientId ||
    userId ||
    "—";
  const ward =
    patientDetails?.ward_name ||
    statePatient?.ward ||
    patientDetails?.ward_no ||
    patientDetails?.ward ||
    "—";
  const room =
    patientDetails?.room_no ||
    statePatient?.room ||
    patientDetails?.room_name ||
    patientDetails?.room ||
    "—";
  const bed = patientDetails?.bed || statePatient?.bed || "—";
  const phone =
    patientDetails?.phone_number ||
    patientDetails?.phone ||
    statePatient?.phone ||
    statePatient?.phone_number ||
    "—";
  const altPhone =
    patientDetails?.alt_phone ||
    statePatient?.alt_phone ||
    statePatient?.altPhone ||
    "—";
  const age = patientDetails?.age || "—";
  const gender = patientDetails?.gender || "—";
  const blood =
    patientDetails?.blood_group || patientDetails?.blood_type || "—";
  const diagnosis =
    patientDetails?.diagnosis || patientDetails?.primary_diagnosis || "—";
  const allergies = patientDetails?.allergies || "—";
  const doctor =
    patientDetails?.attending_doctor || patientDetails?.doctor_name || "—";
  const admitted =
    patientDetails?.admission_date || patientDetails?.admitted_at || "—";
  const address = patientDetails?.address || "—";
  const emergency =
    patientDetails?.emergency_contact ||
    patientDetails?.emergency_contact_name ||
    "—";
  const emergencyPhone =
    patientDetails?.emergency_phone ||
    patientDetails?.emergency_contact_phone ||
    "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl md:text-2xl text-white">Patient Info</h3>
          <p className="text-sm text-white/45">Identity, location, and contact details for this admission.</p>
        </div>
      </div>

      <div className="rounded-[20px] bg-[#2f2f31] border border-white/5 p-4 md:p-5 flex flex-wrap items-center gap-4">
        <div className="size-14 rounded-full bg-[#CCA166]/20 border border-[#CCA166]/35 text-[#E5C48B] flex items-center justify-center text-lg font-semibold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-lg md:text-xl text-white font-medium truncate">{name}</div>
          <div className="text-sm text-white/45 mt-0.5">
            ID {id} · {ward} · Room {room}{bed !== "—" ? ` / Bed ${bed}` : ""}
          </div>
        </div>
      </div>

      <Section title="Identity">
        <Field icon={UserRound} label="Full name" value={name} />
        <Field icon={IdCard} label="Patient ID" value={id} />
        <Field icon={Calendar} label="Age" value={age} accent="#5BBEFF" />
        <Field icon={UserRound} label="Gender" value={gender} accent="#5BBEFF" />
        <Field icon={Droplets} label="Blood group" value={blood} accent="#E54D4D" />
        <Field icon={Calendar} label="Admission date" value={admitted} accent="#FFBB33" />
      </Section>

      <Section title="Location">
        <Field icon={Building2} label="Ward" value={ward} accent="#67E8F9" />
        <Field icon={BedDouble} label="Room" value={room} accent="#67E8F9" />
        <Field icon={BedDouble} label="Bed" value={bed} accent="#67E8F9" />
        <Field icon={Stethoscope} label="Attending doctor" value={doctor} accent="#2CD155" />
        <Field icon={Stethoscope} label="Diagnosis" value={diagnosis} accent="#FF8C42" />
        <Field icon={Droplets} label="Allergies" value={allergies} accent="#E54D4D" />
      </Section>

      <Section title="Contact">
        <Field icon={Phone} label="Phone" value={phone} accent="#CCA166" />
        <Field icon={Phone} label="Alt phone" value={altPhone} accent="#CCA166" />
        <Field icon={UserRound} label="Emergency contact" value={emergency} accent="#FFBB33" />
        <Field icon={Phone} label="Emergency phone" value={emergencyPhone} accent="#FFBB33" />
        <Field icon={MapPin} label="Address" value={address} accent="#5BBEFF" />
      </Section>
    </div>
  );
}
