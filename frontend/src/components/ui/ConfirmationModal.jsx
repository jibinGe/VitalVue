import React from 'react';
import Modal from './modal';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    icon
}) => {
    return (
        <Modal
            modalCondition={isOpen}
            onClick={onClose}
            innerClass="max-w-[520px] !bg-gradient-to-b !from-[#1F1F1F] !to-[#1A1A1A] !rounded-[32px] !border !border-[#ffffff1a] !shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            titleClass="hidden"
        >
            <div className="flex flex-col items-center text-center p-8">
                {icon && (
                    <div className="mb-6 bg-gradient-to-br from-[#2A2A2A] to-[#252525] p-5 rounded-full border border-[#ffffff0d] shadow-[0_8px_24px_rgba(0,0,0,0.3)] transition-transform hover:scale-105">
                        <div className="text-[#D4A362]">
                            {icon}
                        </div>
                    </div>
                )}

                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-4 tracking-tight">
                    {title}
                </h3>

                <p className="text-[#B0B0B0] text-sm md:text-base mb-10 leading-relaxed max-w-[90%] px-2">
                    {message}
                </p>

                <div className="flex items-center gap-3 w-full">
                    {cancelText && (
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 px-6 rounded-2xl bg-[#2A2A2A] text-[#B0B0B0] border border-[#ffffff0d] hover:border-[#ffffff1a] hover:bg-[#2F2F2F] hover:text-white transition-all duration-200 font-medium shadow-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-b from-[#D4A362] to-[#A87B40] text-white shadow-[0_4px_20px_rgba(212,163,98,0.25)] hover:shadow-[0_6px_30px_rgba(212,163,98,0.4)] hover:from-[#DDB070] hover:to-[#B58A50] transition-all duration-200 font-semibold"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
