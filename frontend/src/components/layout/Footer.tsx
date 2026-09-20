import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-[#0A0A0A] py-10 mt-auto text-xs text-zinc-400">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-cyber-yellow text-black flex items-center justify-center font-black text-[10px]">
            HP
          </div>
          <div>
            <span className="text-white font-bold tracking-tight">HackPilot</span> · Hyper-Saturated Fluid Engine · Bedrock &amp; Claude Powered
          </div>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-cyber-yellow shadow-yellow-glow" />
            <span>Phase 1 Active</span>
          </span>
          <span className="hidden sm:inline text-zinc-500">·</span>
          <span className="text-zinc-500">AWS Hackathon Edition</span>
        </div>
      </div>
    </footer>
  );
};
