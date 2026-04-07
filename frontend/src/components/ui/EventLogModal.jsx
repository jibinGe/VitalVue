import React, { useState, useEffect } from 'react';
import Modal from './modal';

const EventLogModal = ({
    isOpen,
    onClose,
    onSave,
    title = "Log Event",
    patientDetails = null
}) => {
    const [eventType, setEventType] = useState('');
    const [description, setDescription] = useState('');
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Set current timestamp when modal opens
            const now = new Date();
            const formattedTime = now.toISOString().slice(0, 16);
            setTimestamp(formattedTime);
            setEventType('');
            setDescription('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!eventType || !description) {
            alert('Please fill in all required fields');
            return;
        }
        onSave({ eventType, description, timestamp });
        onClose();
    };

    const eventTypes = [
        'Vital Sign Change',
        'Medication Administration',
        'Patient Complaint',
        'Clinical Observation',
        'Treatment Response',
        'Other'
    ];

    return (
        <Modal
            modalCondition={isOpen}
            onClick={onClose}
            innerClass="max-w-[500px]! !bg-[#1A1A1A] !rounded-[32px] border border-[#ffffff1a]"
            title={title}
            titleClass="text-2xl font-medium text-white mb-0"
        >
            <div className="flex flex-col gap-6">
                {/* Patient Details Section */}
                {patientDetails && (
                    <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#ffffff0a]">
                        <div className="flex items-center justify-between mb-3">
                            <h6 className="text-white font-medium text-base">Patient Information</h6>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-[#A0A0A0] block mb-1">Name</span>
                                <span className="text-white font-medium">{patientDetails.name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[#A0A0A0] block mb-1">Patient ID</span>
                                <span className="text-white font-medium">{patientDetails.id || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[#A0A0A0] block mb-1">Bed</span>
                                <span className="text-white font-medium">{patientDetails.bed || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[#A0A0A0] block mb-1">ICU Ward</span>
                                <span className="text-white font-medium">{patientDetails.ward || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Type */}
                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Event Type *</label>
                    <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A362]"
                    >
                        <option value="">Select event type...</option>
                        {eventTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Timestamp */}
                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Timestamp *</label>
                    <input
                        type="datetime-local"
                        value={timestamp}
                        onChange={(e) => setTimestamp(e.target.value)}
                        className="w-full bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A362]"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Description *</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter event description..."
                        className="w-full h-32 bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none resize-none placeholder:text-[#525252] focus:ring-1 focus:ring-[#D4A362]"
                    />
                </div>

                <div className="flex items-center gap-4 mt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 rounded-2xl bg-[#2A2A2A] text-[#A0A0A0] border border-transparent hover:border-[#ffffff1a] transition-all font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 px-6 rounded-2xl bg-[linear-gradient(180deg,#D4A362_0%,#A87B40_100%)] text-white shadow-[0_4px_20px_rgba(212,163,98,0.2)] hover:shadow-[0_4px_25px_rgba(212,163,98,0.3)] transition-all font-medium"
                    >
                        Save Event
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EventLogModal;
