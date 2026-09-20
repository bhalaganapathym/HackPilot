"use client";

import React from "react";
import { motion } from "framer-motion";

export type MascotExpression = "idle" | "thinking" | "celebrating" | "worried" | "smug";

interface MascotPilotProps {
  expression?: MascotExpression;
  size?: number;
  speech?: string;
  className?: string;
}

export const MascotPilot: React.FC<MascotPilotProps> = ({
  expression = "idle",
  size = 48,
  speech,
  className = "",
}) => {
  // Eye & Visor configs per expression
  const getVisorGlow = () => {
    switch (expression) {
      case "thinking":
        return "#BF5AF2"; // Violet
      case "celebrating":
        return "#30D158"; // Green
      case "worried":
        return "#FF453A"; // Coral
      case "smug":
        return "#0A84FF"; // Blue
      case "idle":
      default:
        return "#0A84FF";
    }
  };

  const getEyePaths = () => {
    switch (expression) {
      case "thinking":
        return (
          <>
            <circle cx="16" cy="20" r="2" fill="white" />
            <circle cx="24" cy="18" r="2.5" fill="white" />
          </>
        );
      case "celebrating":
        return (
          <>
            {/* Happy arch eyes ^^ */}
            <path d="M14 21 Q16 17 18 21" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M22 21 Q24 17 26 21" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case "worried":
        return (
          <>
            {/* Tilted concerned eyes */}
            <circle cx="15" cy="21" r="2" fill="white" />
            <circle cx="25" cy="21" r="2" fill="white" />
            <path d="M17 25 Q20 23 23 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        );
      case "smug":
        return (
          <>
            {/* Confident half-closed eyes & grin */}
            <path d="M14 20 L18 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 20 L26 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 24 Q22 27 24 23" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        );
      case "idle":
      default:
        return (
          <>
            <circle cx="16" cy="20" r="2.5" fill="white" />
            <circle cx="24" cy="20" r="2.5" fill="white" />
          </>
        );
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={
          expression === "thinking"
            ? { rotate: [-2, 2, -2], y: [0, -1, 0] }
            : expression === "celebrating"
            ? { y: [0, -3, 0], scale: [1, 1.05, 1] }
            : { y: [0, -1, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: expression === "thinking" ? 2.5 : 3,
          ease: "easeInOut",
        }}
      >
        {/* Antenna */}
        <line x1="20" y1="2" x2="20" y2="7" stroke="#86868B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="2" r="2" fill={getVisorGlow()} />

        {/* Helmet Base */}
        <rect x="6" y="8" width="28" height="26" rx="13" fill="var(--fill)" stroke="var(--border)" strokeWidth="1.5" />
        
        {/* Visor Area */}
        <rect x="9" y="13" width="22" height="15" rx="7.5" fill="#1C1C1E" />

        {/* Visor Reflection / Glow */}
        <rect x="10" y="14" width="20" height="13" rx="6.5" fill={getVisorGlow()} fillOpacity="0.15" />
        
        {/* Eyes / Face Expression */}
        {getEyePaths()}
      </motion.svg>

      {speech && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-text-muted bg-fill px-2.5 py-1 rounded-full border border-border"
        >
          {speech}
        </motion.div>
      )}
    </div>
  );
};
