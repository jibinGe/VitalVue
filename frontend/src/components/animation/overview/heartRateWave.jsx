import React from "react";

// Animation classes (.ekg-slide-1, .end-circle) and @keyframes are in index.css
const HeartRateWave = () => {
  return (
    <svg
      className="w-[calc(100%-20px)] relative -top-4 h-auto block"
      width="266"
      height="30"
      viewBox="0 0 266 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 80%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 80%)"
      }}
    >
      {/* Moving EKG Wave Group */}
      <g className="ekg-slide-1">
        {/* First Line */}
        <path
          d="M0 19.2668H14.0606L17.0736 13.8633L20.5887 22.2141L25.6104 0.600098L31.1342 28.6001L33.1429 19.2668H39.671L45.1948 9.93343L49.2121 19.2668H69.8009L72.3117 13.8633L76.8312 24.6703L81.8528 4.52992L86.8745 28.6001L90.8918 19.2668H100.433L104.45 9.93343L107.965 19.2668H116L120.5 13.6001L125.5 19.2668H132.5L135.5 26.6001L141 13.6001L146 19.2668H160.5L163.5 12.1001L166 19.2668H175L179 24.6703L185.5 6.6001L193 28.6001L198.5 9.93343L203.5 20.6001L206.5 12.1001L211.5 19.2668H230L234.5 23.6001L238 19.2668H241.5L245 12.1001L248.5 19.2668H261"
          stroke="#CCA166"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Second Line (Appended continuously to seamlessly loop) */}
        <path
          d="M0 19.2668H14.0606L17.0736 13.8633L20.5887 22.2141L25.6104 0.600098L31.1342 28.6001L33.1429 19.2668H39.671L45.1948 9.93343L49.2121 19.2668H69.8009L72.3117 13.8633L76.8312 24.6703L81.8528 4.52992L86.8745 28.6001L90.8918 19.2668H100.433L104.45 9.93343L107.965 19.2668H116L120.5 13.6001L125.5 19.2668H132.5L135.5 26.6001L141 13.6001L146 19.2668H160.5L163.5 12.1001L166 19.2668H175L179 24.6703L185.5 6.6001L193 28.6001L198.5 9.93343L203.5 20.6001L206.5 12.1001L211.5 19.2668H230L234.5 23.6001L238 19.2668H241.5L245 12.1001L248.5 19.2668H261"
          stroke="#CCA166"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(261, 0)"
        />
      </g>

      {/* Static Inner Dot */}
      <circle cx="261" cy="19.1001" r="1.5" fill="#CCA166" />

      {/* Animated Pulsing Ring */}
      <circle
        className="end-circle"
        cx="261"
        cy="19.1001"
        r="4"
        stroke="#CCA166"
        strokeWidth="1"
      />
    </svg>
  );
};

export default HeartRateWave;
