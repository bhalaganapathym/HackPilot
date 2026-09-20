"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sword, ShieldCheck, MessageCircle, TrendingUp, Flame, Award, Lock } from "lucide-react";

interface BadgeItemProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  size?: "sm" | "md";
}

export const BadgeItem: React.FC<BadgeItemProps> = ({
  name,
  description,
  icon,
  unlocked,
  size = "md",
}) => {
  const getIcon = () => {
    const iconSize = size === "sm" ? 14 : 18;
    switch (icon) {
      case "sword":
        return <Sword size={iconSize} />;
      case "shield-check":
        return <ShieldCheck size={iconSize} />;
      case "message-circle":
        return <MessageCircle size={iconSize} />;
      case "trending-up":
        return <TrendingUp size={iconSize} />;
      case "flame":
        return <Flame size={iconSize} />;
      case "award":
      default:
        return <Award size={iconSize} />;
    }
  };

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-fill/50 border border-border/50">
      <div
        className={`relative flex items-center justify-center rounded-xl border transition-all ${
          size === "sm" ? "w-8 h-8" : "w-10 h-10"
        } ${
          unlocked
            ? "bg-accent-amber/10 border-accent-amber/30 text-accent-amber"
            : "bg-surface border-border text-text-tertiary opacity-60"
        }`}
      >
        {unlocked ? getIcon() : <Lock size={size === "sm" ? 12 : 15} />}

        {/* Metallic sweep effect if unlocked */}
        {unlocked && (
          <motion.div
            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 6, duration: 1.5 }}
          >
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12" />
          </motion.div>
        )}
      </div>

      <div className="flex flex-col min-w-0">
        <span className={`font-medium truncate ${size === "sm" ? "text-xs" : "text-sm"} ${unlocked ? "text-text-primary" : "text-text-muted"}`}>
          {name}
        </span>
        <span className="text-[11px] text-text-muted truncate max-w-[170px]">
          {description}
        </span>
      </div>
    </div>
  );
};
