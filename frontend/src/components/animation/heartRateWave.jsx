import React from "react";

// Animation @keyframes slideEkg2 is defined globally in index.css
const HeartRateWave = () => {
    return (
        <svg
            className="w-full h-auto block"
            viewBox="0 0 121 29"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 80%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 80%)"
            }}
        >
            {/* Moving EKG Wave Group */}
            <g className="ekg-slide-2">
                <path
                    d="M0 19.1667H14.0606L17.0736 13.7632L20.5887 22.114L25.6104 0.5L31.1342 28.5L33.1429 19.1667H39.671L45.1948 9.83333L49.2121 19.1667H69.8009L72.3117 13.7632L76.8312 24.5702L81.8528 4.42982L86.8745 28.5L90.8918 19.1667H100.433L104.45 9.83333L107.965 19.1667H116"
                    stroke="#CCA166"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M0 19.1667H14.0606L17.0736 13.7632L20.5887 22.114L25.6104 0.5L31.1342 28.5L33.1429 19.1667H39.671L45.1948 9.83333L49.2121 19.1667H69.8009L72.3117 13.7632L76.8312 24.5702L81.8528 4.42982L86.8745 28.5L90.8918 19.1667H100.433L104.45 9.83333L107.965 19.1667H116"
                    stroke="#CCA166"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform="translate(116, 0)"
                />
            </g>

            {/* Pulse dot */}
            <circle cx="116" cy="19" r="1.5" fill="#CCA166" />
            <circle
                className="end-circle-small"
                cx="116"
                cy="19"
                r="4"
                stroke="#CCA166"
            />
        </svg>
    );
};

export default HeartRateWave;
