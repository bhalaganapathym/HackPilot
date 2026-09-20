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
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="rounded-3xl bg-surface border border-accent-blue/30 shadow-popover p-5 backdrop-blur-md relative overflow-hidden"
      >
        {/* Top bar with step indicator & close button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">
              <Compass size={12} />
              <span>Jury Tour {stepData.step} of {TOUR_STEPS.length}</span>
            </span>
            <span className="text-xs text-text-tertiary">·</span>
            <span className="text-xs text-text-muted">{stepData.subtitle}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-fill transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary mb-1">
            {stepData.title}
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {stepData.caption}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStepIdx
                    ? "w-6 bg-accent-blue"
                    : "w-1.5 bg-fill"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 text-xs font-medium rounded-xl text-text-muted hover:text-text-primary hover:bg-fill transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm transition-all flex items-center gap-1"
            >
              <span>{currentStepIdx === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next"}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
