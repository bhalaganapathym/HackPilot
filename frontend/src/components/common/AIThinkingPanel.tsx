"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { MascotPilot } from "./MascotPilot";

interface AIThinkingPanelProps {
  currentThought: string;
  allThoughts?: string[];
  isThinking: boolean;
  className?: string;
}

export const AIThinkingPanel: React.FC<AIThinkingPanelProps> = ({
  currentThought,
  allThoughts = [],
  isThinking,
  className = "",
}) => {
  const [showReasoning, setShowReasoning] = useState(false);

  if (!isThinking && !currentThought && allThoughts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`rounded-xl border border-accent-violet/30 bg-accent-violet/5 px-3.5 py-2 transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MascotPilot expression="thinking" size={24} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-semibold text-accent-violet uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className={isThinking ? "animate-spin" : ""} />
              {isThinking ? "AI Thinking" : "Evaluated"}
            </span>
            <span className="text-xs text-text-primary truncate max-w-md sm:max-w-xl">
              {currentThought || "Synthesizing evaluation..."}
            </span>
          </div>
        </div>

        {allThoughts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-[11px] font-medium text-accent-violet hover:underline flex items-center gap-0.5 focus-visible:outline-none shrink-0"
          >
            {showReasoning ? "Hide reasoning" : "Show reasoning"}
            <motion.div animate={{ rotate: showReasoning ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={12} />
            </motion.div>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showReasoning && allThoughts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-accent-violet/20 font-mono text-[11px] text-text-muted space-y-1">
              {allThoughts.map((t, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-accent-violet/70">›</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
