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
      className={`relative inline-flex p-1 rounded-full bg-void-gray/70 border border-white/10 backdrop-blur-md ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 px-4 font-bold transition-all rounded-full flex items-center justify-center focus-visible:outline-none active:scale-95 ${
              size === "sm" ? "h-7 text-xs" : "h-9 text-sm"
            } ${isSelected ? "text-black font-extrabold" : "text-zinc-400 hover:text-white"}`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-pill"
                className="absolute inset-0 bg-cyber-yellow rounded-full shadow-md -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
