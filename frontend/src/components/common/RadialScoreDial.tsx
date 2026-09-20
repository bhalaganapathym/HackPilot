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
    if (score >= 75) return "var(--accent-green)";
    if (score >= 50) return "var(--accent-amber)";
    return "var(--accent-coral)";
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
            stroke="var(--fill)"
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
            <span className="text-3xl sm:text-4xl font-mono font-semibold tracking-tight text-text-primary">
              {displayScore}
            </span>
            <span className="text-xs sm:text-sm font-mono text-text-muted ml-0.5">/100</span>
          </div>
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider mt-0.5">
            {label}
          </span>
        </div>

        {/* Score Delta Badge */}
        {delta !== null && delta !== undefined && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: -4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium shadow-sm border ${
              delta >= 0
                ? "bg-accent-green/10 text-accent-green border-accent-green/20"
                : "bg-accent-coral/10 text-accent-coral border-accent-coral/20"
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </motion.div>
        )}
      </div>

      {showVerdict && (
        <span
          className="mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full border border-border bg-fill transition-colors"
          style={{ color: getColor() }}
        >
          {getVerdict()}
        </span>
      )}
    </div>
  );
};
