"use client";

import React from "react";
import { motion } from "framer-motion";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentedControlProps<T>) => {
  return (
    <div
      className={`relative inline-flex p-1 rounded-xl bg-fill border border-border ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 px-3 font-medium transition-colors rounded-lg flex items-center justify-center focus-visible:outline-none ${
              size === "sm" ? "h-7 text-xs" : "h-8 text-sm"
            } ${isSelected ? "text-text-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-pill"
                className="absolute inset-0 bg-surface rounded-lg shadow-sm border border-border/60 -z-10"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
