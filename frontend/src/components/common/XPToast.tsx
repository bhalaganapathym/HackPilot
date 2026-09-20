"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";

interface XPToastProps {
  xp: number | null;
  levelUp?: boolean;
  newLevel?: number;
  onDone?: () => void;
}

export const XPToast: React.FC<XPToastProps> = ({
  xp,
  levelUp = false,
  newLevel,
  onDone,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none flex flex-col items-end gap-2">
      <AnimatePresence>
        {xp && xp > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={() => {
              if (onDone) setTimeout(onDone, 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-accent-green/30 shadow-lg text-accent-green font-mono font-semibold text-sm"
          >
            <Sparkles size={14} />
            <span>+{xp} XP</span>
          </motion.div>
        )}

        {levelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-surface border border-accent-amber/40 shadow-xl text-text-primary"
          >
            <div className="w-8 h-8 rounded-xl bg-accent-amber/15 text-accent-amber flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-accent-amber uppercase tracking-wider">Level Up!</span>
              <span className="text-sm font-bold text-text-primary">Reached Level {newLevel || 2}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
