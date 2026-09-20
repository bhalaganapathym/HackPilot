"use client";

import React from "react";
import { motion } from "framer-motion";

interface SegmentedHpBarProps {
  currentHp: number; // 0 - 100
  maxHp?: number;
  segments?: number;
  label?: string;
  className?: string;
}

export const SegmentedHpBar: React.FC<SegmentedHpBarProps> = ({
  currentHp,
  maxHp = 100,
  segments = 10,
  label = "Survival HP",
  className = "",
}) => {
  const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const activeSegments = Math.ceil((hpPct / 100) * segments);

  const getHpColor = () => {
    if (hpPct > 60) return "var(--accent-green)";
    if (hpPct > 30) return "var(--accent-amber)";
    return "var(--accent-coral)";
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-muted">{label}</span>
        <span className="font-mono font-semibold" style={{ color: getHpColor() }}>
          {currentHp} / {maxHp}
        </span>
      </div>

      <div className="flex items-center gap-1 w-full h-3">
        {Array.from({ length: segments }).map((_, index) => {
          const isActive = index < activeSegments;
          return (
            <motion.div
              key={index}
              initial={false}
              animate={{
                backgroundColor: isActive ? getHpColor() : "var(--fill)",
                opacity: isActive ? 1 : 0.4,
              }}
              transition={{ duration: 0.3 }}
              className="flex-1 h-full rounded-sm border border-border/40"
            />
          );
        })}
      </div>
    </div>
  );
};
