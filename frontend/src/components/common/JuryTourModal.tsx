"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, ArrowRight, ArrowLeft, X } from "lucide-react";

interface JuryTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: "HackPilot Mission Control",
    subtitle: "Calm Core, Vivid Moments",
    route: "/",
    caption: "HackPilot turns hackathon friction into a game. Participants get instant AI feedback framed as Quests, while organizers gain cluster intelligence.",
  },
  {
    step: 2,
    title: "Abstract Analyzer & Quests",
    subtitle: "Turn Weaknesses into XP",
    route: "/abstract",
    caption: "Every abstract is scored across 5 dimensions with cited evidence phrases. Weaknesses transform into actionable Quests that award XP upon resolution.",
  },
  {
    step: 3,
    title: "Before & After Hero Moment",
    subtitle: "Live Score Delta",
    route: "/abstract",
    caption: "Try the 1-click 'Improve with suggested fixes' demo. Watch the score jump from 48 to 86 with an animated delta badge and celebratory feedback.",
  },
  {
    step: 4,
    title: "Problem Statement Explainer",
    subtitle: "Plain-English Decoding & Q&A",
    route: "/problem",
    caption: "Uncovers mandatory requirements, hidden evaluation criteria, and architectural ambiguities. The Q&A oracle answers with sentence citations and admits when unstated.",
  },
  {
    step: 5,
    title: "Idea Red Team Arena",
    subtitle: "Boss-Fight Stress Test",
    route: "/redteam",
    caption: "Simulates grand-jury scrutiny across 7 failure domains. Participants defend against tailored attacks, restoring survival HP and earning badges.",
  },
  {
    step: 6,
    title: "Two-Sided Organizer Console",
    subtitle: "Coming in Phase 3 Preview",
    route: "/organizer",
    caption: "Shared Submission models link directly to the organizer console, previewing domain clustering and judge fatigue balancing.",
  },
];

export const JuryTourModal: React.FC<JuryTourModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const stepData = TOUR_STEPS[currentStepIdx];

  // Navigate to corresponding route when step changes
  useEffect(() => {
    if (isOpen && stepData) {
      router.push(stepData.route);
    }
  }, [isOpen, currentStepIdx, router, stepData]);

  // Handle keyboard navigation (Escape to exit, Arrow keys)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setCurrentStepIdx((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        setCurrentStepIdx((prev) => (prev > 0 ? prev - 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="rounded-[32px] bg-void-charcoal/95 border border-white/20 shadow-2xl p-6 backdrop-blur-2xl relative overflow-hidden text-white"
      >
        {/* Top bar with step indicator & close button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-cyber-yellow text-black shadow-yellow-glow">
              <Compass size={13} />
              <span>Jury Tour {stepData.step}/{TOUR_STEPS.length}</span>
            </span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400 font-medium">{stepData.subtitle}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-black text-white tracking-tight">
            {stepData.title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed font-normal">
            {stepData.caption}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStepIdx
                    ? "w-8 bg-cyber-yellow shadow-yellow-glow"
                    : "w-2 bg-white/10"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 text-xs font-bold rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 active:scale-95"
              >
                <ArrowLeft size={13} />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 text-xs font-bold rounded-full bg-cyber-yellow text-black hover:bg-cyber-yellow-hover shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{currentStepIdx === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next Step"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
