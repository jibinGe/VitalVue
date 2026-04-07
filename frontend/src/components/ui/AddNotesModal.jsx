import React, { useState, useEffect } from 'react';
import Modal from './modal';
import { Flag } from '../../utilities/icons';

const AddNotesModal = ({
    isOpen,
    onClose,
    onSave,
    defaultNotes = '',
    defaultFlag = false,
    title = "Add Notes",
    patientDetails = null
}) => {
    const [notes, setNotes] = useState(defaultNotes);
    const [isFlagged, setIsFlagged] = useState(defaultFlag);

    useEffect(() => {
        if (isOpen) {
            setNotes(defaultNotes);
            setIsFlagged(defaultFlag);
        }
    }, [isOpen, defaultNotes, defaultFlag]);

    const handleSave = () => {
        onSave({ notes, isFlagged });
        onClose();
    };

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

                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Enter your clinical notes here..."
                        className="w-full h-32 bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none resize-none placeholder:text-[#525252]"
                    />
                </div>

                <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => setIsFlagged(!isFlagged)}
                >
                    <div className={`size-5 rounded border flex items-center justify-center transition-colors ${isFlagged ? 'bg-[#D4A362] border-[#D4A362]' : 'border-[#404040] bg-transparent'}`}>
                        {isFlagged && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <span className="text-white text-sm">Flag for doctor review</span>
                    {isFlagged && <Flag className="text-[#D4A362] size-5 ml-auto" />}
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
                        Save
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AddNotesModal;
