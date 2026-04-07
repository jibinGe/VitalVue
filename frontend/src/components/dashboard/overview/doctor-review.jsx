import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, User } from "lucide-react";
import ConfirmationModal from "../../ui/ConfirmationModal";
import { SuccessTik } from "../../../utilities/icons";
import { patientService } from "../../../services/patientService";

export default function DoctorReview({ onClick, patientDetails = {}, userId }) {
    const [finalText, setFinalText] = useState("");
    const [interimText, setInterimText] = useState("");
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);

    // Extract patient details with defaults
    const {
        name = "Arthur Crane",
        id = "P-1049",
        ward = "ICU-301",
        bed = "12A",
        news2Score = 1,
        lastSync = "2m ago"
    } = patientDetails;

    // State for selected tags and success modal
    const [selectedTags, setSelectedTags] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState(`Doctor review has been saved and synced successfully for patient ${name}.`);

    // Doctor selection state
    const [doctors, setDoctors] = useState([]);
    const [doctorsLoading, setDoctorsLoading] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [doctorSearchQuery, setDoctorSearchQuery] = useState("");

    // Fetch doctors: first get org_id from /api/v1/user/me, then fetch doctors for that org
    useEffect(() => {
        const fetchDoctors = async () => {
            setDoctorsLoading(true);
            try {
                // Step 1: get the logged-in user's profile to retrieve organization_id
                const profileRes = await patientService.getUserProfile();
                const orgId = profileRes?.data?.organization_id;

                if (!orgId) {
                    console.error('Could not determine organization_id from user profile');
                    return;
                }

                // Step 2: fetch doctors for this organization
                const response = await patientService.getDoctors(orgId);
                if (response.success && Array.isArray(response.data)) {
                    setDoctors(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch doctors:', error);
            } finally {
                setDoctorsLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
            let interim = "";
            let final = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];

                if (result.isFinal) {
                    final += result[0].transcript + " ";
                } else {
                    interim += result[0].transcript;
                }
            }
            setInterimText(interim);
            if (final) {
                setFinalText((prev) => prev + final);
                setInterimText("");
            }
        };

        recognition.onstart = () => setListening(true);
        recognition.onend = () => setListening(false);
        recognitionRef.current = recognition;
        return () => recognition.stop();
    }, []);

    const toggleMic = () => {
        if (!recognitionRef.current) return;
        if (listening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };

    // Toggle tag selection
    const toggleTag = (tagValue) => {
        setSelectedTags(prev =>
            prev.includes(tagValue)
                ? prev.filter(t => t !== tagValue)
                : [...prev, tagValue]
        );
    };

    // Handle save with real API call
    const handleSave = async () => {
        // Build message from notes + selected tags
        const tagString = selectedTags.length > 0 ? `[Tags: ${selectedTags.join(', ')}] ` : '';
        const noteText = finalText.trim() || 'Manual urgent clinical assistance requested.';
        const message = `${tagString}${noteText}`;

        try {
            const response = await patientService.flagDoctorForReview({
                patientId: userId || id,
                doctorId: selectedDoctor?.id || '',
                message,
                priority: 'High',
            });

            if (response.success) {
                const doctorName = selectedDoctor ? ` Assigned to ${selectedDoctor.full_name}.` : '';
                setSuccessMessage(`Doctor review has been saved and synced successfully for patient ${name}.${doctorName}`);
            } else {
                setSuccessMessage(response.message || 'Failed to flag doctor for review.');
            }
        } catch (error) {
            console.error('Error flagging doctor for review:', error);
            setSuccessMessage('An error occurred while flagging the doctor for review.');
        }

        setShowSuccessModal(true);
    };

    // Handle success modal close
    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onClick(); // Close the main modal
    };


    const quick_tags = [
        {
            value: 'General',
            color: '#DB6357',
            bg: '#FCF0EA1F',
        },
        {
            value: 'Vitals',
            color: '#47B4EB',
            bg: '#E5F6FF1F',
        },
        {
            value: 'AF',
            color: '#E06CE0',
            bg: '#FFE5FF1F',
        },
        {
            value: 'Respiratory',
            color: '#169C59',
            bg: '#E5FFF01F',
        },
        {
            value: 'Seizure',
            color: '#E5664D',
            bg: '#FFEEE51F',
        },
        {
            value: 'Fall/Mobility',
            color: '#E5AD00',
            bg: '#FFF9E51F',
        },
        {
            value: 'Medications',
            color: '#29A3A3',
            bg: '#E9FCF91F',
        },
    ];

    const filteredDoctors = doctors.filter(d =>
        d.full_name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
        (d.employee_id || '').toLowerCase().includes(doctorSearchQuery.toLowerCase())
    );

    return (
        <>
            <div className="px-5 lg:px-8 py-4 lg:py-5 flex flex-wrap gap-4 justify-between">
                <div className="flex flex-col gap-y-2">
                    <h4>{name}</h4>
                    <div className='flex items-center gap-2 text-sm font-normal text-white'>
                        <span>ID: {id}</span>
                        <span className='size-1 rounded-full bg-para'></span>
                        <span>{ward}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-y-1.5">
                    <span className='inline-flex items-center justify-center min-h-8 text-sm lg:text-base px-4 text-[#E54D4D] rounded-full bg-[#E54D4D]/15'>NEWS2: {news2Score}</span>
                    <p className='text-sm lg:text-base text-para flex items-center gap-1'>Last Sync: <span className='text-white'>{lastSync}</span></p>
                </div>
            </div>
            <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
            <div className="p-5 md:p-6 lg:p-8 flex flex-col gap-y-4 md:gap-y-6 lg:gap-y-9">

                {/* Doctor Selection */}
                <div className="flex flex-col">
                    <label className='text-sm lg:text-base mb-3 lg:mb-4 text-white block'>
                        Assign to Doctor <span className="text-[#A0A0A0] text-sm font-normal">(optional)</span>
                    </label>
                    <div className="bg-[#2C2C2E] border border-solid border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search doctor..."
                            value={doctorSearchQuery}
                            onChange={(e) => setDoctorSearchQuery(e.target.value)}
                            className="bg-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#5E656E] border border-white/10 focus:outline-none focus:border-primary/40 mb-1"
                        />
                        {/* Doctor List */}
                        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                            {/* None option */}
                            <button
                                type="button"
                                onClick={() => setSelectedDoctor(null)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${!selectedDoctor
                                        ? 'bg-[#2CD155]/10 border border-[#2CD155]'
                                        : 'border border-transparent hover:bg-white/5'
                                    }`}
                            >
                                <div className="size-9 rounded-full bg-[#3F3F41] flex items-center justify-center flex-shrink-0">
                                    <User size={16} className="text-[#A0A0A0]" />
                                </div>
                                <span className="text-sm text-[#A0A0A0]">No specific doctor (broadcast)</span>
                            </button>

                            {doctorsLoading ? (
                                <div className="flex items-center gap-2 px-3 py-2 text-[#A0A0A0] text-sm">
                                    <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Loading doctors...
                                </div>
                            ) : filteredDoctors.length === 0 ? (
                                <div className="text-sm text-[#A0A0A0] px-3 py-2">
                                    {doctorSearchQuery ? `No results for "${doctorSearchQuery}"` : 'No doctors available'}
                                </div>
                            ) : (
                                filteredDoctors.map((doc) => (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => setSelectedDoctor(doc)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${selectedDoctor?.id === doc.id
                                                ? 'bg-[#2CD155]/10 border border-[#2CD155]'
                                                : 'border border-transparent hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="size-9 rounded-full bg-gradient-to-br from-[#3a3a4a] to-[#4a4a5a] flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-xs font-semibold">
                                                {doc.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm text-white leading-tight truncate">{doc.full_name}</span>
                                            <span className="text-xs text-[#A0A0A0]">{doc.employee_id || 'Doctor'}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    {selectedDoctor && (
                        <p className="mt-2 text-xs text-[#2CD155]">
                            ✓ Assigning to {selectedDoctor.full_name}
                        </p>
                    )}
                </div>

                <div className="flex flex-col relative z-1">
                    <label htmlFor="" className='text-sm lg:text-base mb-3 lg:mb-5 text-white block '>New Entry</label>
                    <textarea
                        value={finalText + interimText}
                        onChange={(e) => setFinalText(e.target.value)}
                        name=""
                        id=""
                        className='bg-[#2C2C2E] border-[1.5px] border-solid border-primary/35 min-h-38 rounded-2xl md:rounded-3xl resize-none p-4 md:p-5 lg:p-6 placeholder:text-[#5E656E] placeholder:transition-all placeholder:duration-300 focus:placeholder:translate-x-2 focus:placeholder:opacity-0 ring-0 ring-primary/40 focus:ring-1'
                        placeholder='Type observation here...'
                    />
                    <button
                        onClick={toggleMic}
                        type='button'
                        className='absolute bottom-0 right-0 p-6 text-white'>
                        {listening ? <MicOff /> : <Mic />}
                    </button>
                </div>
                <div className="flex flex-col">
                    <label htmlFor="" className='text-sm lg:text-base mb-3 lg:mb-5 text-white block '>Quick Tags</label>
                    <div className="flex items-center flex-wrap gap-3 md:gap-4.75">
                        {quick_tags.map((item, index) => {
                            const isSelected = selectedTags.includes(item.value);
                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => toggleTag(item.value)}
                                    className={`inline-flex grow items-center justify-center text-sm md:text-base lg:text-lg font-normal leading-none min-h-10 lg:min-h-12 rounded-full px-4 md:px-5 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-2 ring-offset-[#2D2D2F] scale-105' : 'hover:scale-105'
                                        }`}
                                    style={{
                                        color: item.color,
                                        backgroundColor: `${item.bg}`,
                                        ringColor: isSelected ? item.color : 'transparent'
                                    }}
                                >
                                    {item.value}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex flex-col">
                    <label htmlFor="" className='text-sm lg:text-base mb-3 lg:mb-5 text-white block '>History</label>
                    <div className="flex items-start gap-4 md:gap-5 lg:gap-6">
                        <div className="flex-none size-12 text-white rounded-full border-3 border-solid border-[#252527] outline outline-solid outline-primary/60 flex items-center justify-center bg-[#3F3F40]">
                            <User />
                        </div>
                        <div className="grow flex-none bg-[#2F2F31]/70 p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl">
                            <div className="flex items-center flex-wrap justify-between gap-2 mb-3">
                                <h5 className="text-base md:text-lg leading-none font-normal">Nurse Anisha (RN)</h5>
                                <span className="text-sm font-normal text-para">12 Nov | 14:22</span>
                            </div>
                            <p className="text-sm md:text-base leading-tight text-para">Patient complained of dizziness. BP trending up. Doctor notified.</p>
                            <div className="mt-6 md:mt-8 lg:mt-12 flex items-center gap-3 md:gap-5 lg:gap-6 flex-wrap">
                                <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                                    <span className="text-base font-normal text-para">Source:</span>
                                    <span className="text-sm font-normal text-white rounded-full bg-[#3E3E41] px-4 min-h-7.5 inline-flex items-center">Voice-to-Text</span>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
                                    <span className="text-base font-normal text-para">Event:</span>
                                    <span className="text-sm font-normal text-white rounded-full bg-[#3E3E41] px-4 min-h-7.5 inline-flex items-center">Voice-to-Text</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
            <div className="px-5 lg:px-8 py-4 lg:py-6 flex items-center flex-wrap justify-end gap-4 md:gap-5">
                <button onClick={onClick} className="btn md:min-w-40 min-h-12 md:min-h-14">Cancel</button>
                <button onClick={handleSave} className="btn md:min-w-40 min-h-12 md:min-h-14 btn-gradient">Save &amp; Sync</button>
            </div>

            <ConfirmationModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                onConfirm={handleSuccessClose}
                title="Saved &amp; Synced"
                message={successMessage}
                confirmText="OK"
                cancelText=""
                icon={<SuccessTik className="size-6 text-[#2CD155]" />}
            />
        </>
    )
}
