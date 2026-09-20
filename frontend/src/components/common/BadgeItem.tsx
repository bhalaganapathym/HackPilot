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
    <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyber-yellow/40 transition-colors">
      <div
        className={`relative flex items-center justify-center rounded-xl border transition-all ${
          size === "sm" ? "w-8 h-8" : "w-10 h-10"
        } ${
          unlocked
            ? "bg-cyber-yellow text-black border-cyber-yellow shadow-yellow-glow font-bold"
            : "bg-white/5 border-white/10 text-zinc-500 opacity-60"
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
        <span className={`font-bold truncate ${size === "sm" ? "text-xs" : "text-sm"} ${unlocked ? "text-white" : "text-zinc-500"}`}>
          {name}
        </span>
        <span className="text-[10px] text-zinc-400 truncate max-w-[170px]">
          {description}
        </span>
      </div>
    </div>
  );
};
