import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border/60 py-6 mt-auto">
      <div className="max-w-[1120px] mx-auto px-4 flex items-center justify-between text-xs text-text-tertiary">
        <div>
          Engine: <span className="text-text-muted font-medium">Mock v1</span> · Bedrock-ready · Built for AWS Hackathon
        </div>
        <div className="hidden sm:block">
          HackPilot Phase 1
        </div>
      </div>
    </footer>
  );
};
