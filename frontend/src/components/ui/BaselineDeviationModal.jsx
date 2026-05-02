import React, { useState, useEffect } from 'react';
import Modal from './modal';

const BaselineDeviationModal = ({
    isOpen,
    onClose,
    onSave,
    title = "Baseline Deviation",
    patientDetails = null
}) => {
    const [vitalParameter, setVitalParameter] = useState('');
    const [baselineValue, setBaselineValue] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setVitalParameter('');
            setBaselineValue('');
            setCurrentValue('');
            setNotes('');
        }
    }, [isOpen]);

    const calculateDeviation = () => {
        if (!baselineValue || !currentValue) return null;
        const baseline = parseFloat(baselineValue);
        const current = parseFloat(currentValue);
        if (isNaN(baseline) || isNaN(current) || baseline === 0) return null;
        const deviation = ((current - baseline) / baseline) * 100;
        return deviation.toFixed(2);
    };

    const handleSave = () => {
        if (!vitalParameter || !baselineValue || !currentValue) {
            alert('Please fill in all required fields');
            return;
        }
        const deviation = calculateDeviation();
        onSave({
            vitalParameter,
            baselineValue,
            currentValue,
            deviation,
            notes
        });
        onClose();
    };

    const vitalParameters = [
        'Heart Rate',
        'Blood Pressure (Systolic)',
        'Blood Pressure (Diastolic)',
        'SpO2',
        'Temperature',
        'Respiratory Rate',
        'HRV Score',
        'Other'
    ];

    const deviation = calculateDeviation();

    return (
        <Modal
            modalCondition={isOpen}
            onClick={onClose}
            innerClass="max-w-[500px]! !bg-[#1A1A1A] !rounded-[32px] border border-[#ffffff1a]"
            title={title}
            titleClass="text-2xl font-medium text-white mb-0"
        >
            <div className="flex flex-col gap-6">

                {/* Vital Parameter */}
                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Vital Parameter *</label>
                    <select
                        value={vitalParameter}
                        onChange={(e) => setVitalParameter(e.target.value)}
                        className="w-full bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A362]"
                    >
                        <option value="">Select vital parameter...</option>
                        {vitalParameters.map((param) => (
                            <option key={param} value={param}>{param}</option>
                        ))}
                    </select>
                </div>

                {/* Baseline and Current Values */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[#A0A0A0] text-sm mb-2 block">Baseline Value *</label>
                        <input
                            type="number"
                            step="0.1"
                            value={baselineValue}
                            onChange={(e) => setBaselineValue(e.target.value)}
                            placeholder="e.g., 120"
                            className="w-full bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A362]"
                        />
                    </div>
                    <div>
                        <label className="text-[#A0A0A0] text-sm mb-2 block">Current Value *</label>
                        <input
                            type="number"
                            step="0.1"
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            placeholder="e.g., 145"
                            className="w-full bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A362]"
                        />
                    </div>
                </div>

                {/* Deviation Display */}
                {deviation !== null && (
                    <div className="bg-[#2A2A2A] rounded-xl p-4 border border-[#ffffff0a]">
                        <div className="flex items-center justify-between">
                            <span className="text-[#A0A0A0] text-sm">Deviation</span>
                            <span className={`text-lg font-semibold ${Math.abs(parseFloat(deviation)) > 20
                                ? 'text-[#E54D4D]'
                                : Math.abs(parseFloat(deviation)) > 10
                                    ? 'text-[#FFBB33]'
                                    : 'text-[#2CD155]'
                                }`}>
                                {deviation > 0 ? '+' : ''}{deviation}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="text-[#A0A0A0] text-sm mb-2 block">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional observations..."
                        className="w-full h-24 bg-[#2A2A2A] rounded-xl p-4 text-white text-sm focus:outline-none resize-none placeholder:text-[#525252] focus:ring-1 focus:ring-[#D4A362]"
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
                        Save Deviation
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BaselineDeviationModal;
