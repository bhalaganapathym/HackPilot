"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/animations";

interface RadialScoreDialProps {
  score: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  delta?: number | null;
  label?: string;
  showVerdict?: boolean;
}

export const RadialScoreDial: React.FC<RadialScoreDialProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  delta = null,
  label = "Score",
  showVerdict = false,
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const counterRef = useRef({ val: 0 });

  useEffect(() => {
    const endVal = Math.min(Math.max(score, 0), 100);
    if (prefersReducedMotion()) {
      setDisplayScore(endVal);
      return;
    }

    const tween = gsap.to(counterRef.current, {
      val: endVal,
      duration: 0.85,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayScore(Math.round(counterRef.current.val));
      },
    });

    return () => {
      tween.kill();
    };
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine semantic color according to score
  const getColor = () => {
    if (score >= 75) return "#FDE047";
    if (score >= 50) return "#38BDF8";
    return "#F87171";
  };

  const getVerdict = () => {
    if (score >= 80) return "Jury Ready";
    if (score >= 60) return "Solid Foundation";
    return "Needs Polish";
  };

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Animated Progress Stroke */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Score & Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <div className="flex items-baseline justify-center">
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white">
              {displayScore}
            </span>
            <span className="text-xs sm:text-sm font-mono text-zinc-400 ml-0.5 font-bold">/100</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
            {label}
          </span>
        </div>

        {/* Score Delta Badge */}
        {delta !== null && delta !== undefined && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: -4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`absolute -top-1 -right-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-black shadow-md border ${
              delta >= 0
                ? "bg-cyber-yellow text-black border-black/20"
                : "bg-rose-500/20 text-rose-400 border-rose-500/40"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.div>
        )}
      </div>

      {showVerdict && (
        <span
          className="mt-3 text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/15 bg-white/5 transition-colors"
          style={{ color: getColor() }}
        >
          {getVerdict()}
        </span>
      )}
    </div>
  );
};
