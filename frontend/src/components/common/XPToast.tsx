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
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.85 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (onDone) setTimeout(onDone, 2500);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyber-yellow text-black font-mono font-black text-sm shadow-yellow-glow border border-black/20"
          >
            <Sparkles size={16} className="fill-black" />
            <span>+{xp} XP EARNED</span>
          </motion.div>
        )}

        {levelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3 px-5 py-3 rounded-[32px] bg-void-charcoal/95 border border-cyber-yellow/40 shadow-2xl backdrop-blur-2xl text-white"
          >
            <div className="w-10 h-10 rounded-full bg-cyber-yellow text-black flex items-center justify-center font-black shadow-yellow-glow">
              <Trophy size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-black text-cyber-yellow uppercase tracking-widest">Level Up!</span>
              <span className="text-sm font-extrabold text-white">Reached Level {newLevel || 2}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
