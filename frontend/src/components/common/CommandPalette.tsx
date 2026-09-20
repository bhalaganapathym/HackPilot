"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  HelpCircle,
  ShieldAlert,
  LayoutGrid,
  Compass,
  Volume2,
  Moon,
  Swords,
  Zap,
  X
} from "lucide-react";
import { sounds } from "@/lib/sounds";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchJuryMode?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onLaunchJuryMode,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = [
    {
      id: "jury",
      title: "Start Jury Mode (60s Tour)",
      category: "Demo",
      icon: Compass,
      perform: () => {
        onClose();
        if (onLaunchJuryMode) onLaunchJuryMode();
      },
    },
    {
      id: "abstract",
      title: "Go to Abstract Analyzer",
      category: "Navigation",
      icon: FileText,
      perform: () => {
        onClose();
        router.push("/abstract");
      },
    },
    {
      id: "problem",
      title: "Go to Problem Statement Explainer",
      category: "Navigation",
      icon: HelpCircle,
      perform: () => {
        onClose();
        router.push("/problem");
      },
    },
    {
      id: "redteam",
      title: "Go to Idea Red Team Arena",
      category: "Navigation",
      icon: ShieldAlert,
      perform: () => {
        onClose();
        router.push("/redteam");
      },
    },
    {
      id: "organizer",
      title: "Go to Organizer Console Preview",
      category: "Navigation",
      icon: LayoutGrid,
      perform: () => {
        onClose();
        router.push("/organizer");
      },
    },
    {
      id: "duel",
      title: "Go to Idea Duel",
      category: "Navigation",
      icon: Swords,
      perform: () => {
        onClose();
        router.push("/duel");
      },
    },
    {
      id: "rapid-fire",
      title: "Go to 60-Second Rapid Fire",
      category: "Navigation",
      icon: Zap,
      perform: () => {
        onClose();
        router.push("/rapid-fire");
      },
    },
    {
      id: "pitch-deck",
      title: "Go to Pitch Deck Analyzer",
      category: "Navigation",
      icon: FileText,
      perform: () => {
        onClose();
        router.push("/pitch-deck");
      },
    },

    {
      id: "sound",
      title: "Toggle WebAudio Sound Effects",
      category: "Settings",
      icon: Volume2,
      perform: () => {
        sounds.toggleSound();
        onClose();
      },
    },
    {
      id: "theme",
      title: "Toggle Dark / Light Appearance",
      category: "Settings",
      icon: Moon,
      perform: () => {
        const isDark = document.documentElement.classList.contains("dark");
        if (isDark) {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
          localStorage.setItem("hackpilot_theme", "light");
        } else {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
          localStorage.setItem("hackpilot_theme", "dark");
        }
        onClose();
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].perform();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg rounded-[32px] bg-void-charcoal/95 border border-white/20 shadow-2xl backdrop-blur-2xl overflow-hidden z-10 text-white"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-5 py-4 border-b border-white/10">
              <Search size={18} className="text-cyber-yellow shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or jump to tool..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full ml-3 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions List */}
            <div className="max-h-72 overflow-y-auto p-3 space-y-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-400">
                  No matching commands found.
                </div>
              ) : (
                filtered.map((action, idx) => {
                  const Icon = action.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => action.perform()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-left transition-all ${
                        isSelected
                          ? "bg-cyber-yellow text-black font-bold shadow-sm"
                          : "text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={isSelected ? "text-black" : "text-zinc-400"} />
                        <span className="text-xs font-semibold">{action.title}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full border ${
                        isSelected
                          ? "border-black/20 bg-black/10 text-black font-bold"
                          : "border-white/10 bg-white/5 text-zinc-400"
                      }`}>
                        {action.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>↑↓ navigate · Enter select · Esc close</span>
              <span className="text-cyber-yellow">⌘K</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
