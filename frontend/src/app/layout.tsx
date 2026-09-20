"use client";

import React, { useState, useEffect } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { HeaderHUD } from "@/components/layout/HeaderHUD";
import { Footer } from "@/components/layout/Footer";
import { CommandPalette } from "@/components/common/CommandPalette";
import { JuryTourModal } from "@/components/common/JuryTourModal";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isJuryTourOpen, setIsJuryTourOpen] = useState(false);

  useEffect(() => {
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem("hackpilot_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else if (savedTheme === "dark" || systemPrefersDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }

    // Global keyboard shortcut for Command Palette
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    const handleOpenJuryTour = () => setIsJuryTourOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-jury-mode", handleOpenJuryTour);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-jury-mode", handleOpenJuryTour);
    };
  }, []);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <title>HackPilot · Two-Sided Hackathon Co-Pilot</title>
        <meta
          name="description"
          content="HackPilot turns hackathon friction into a game. Real-time AI feedback framed as Quests, stress-test Red Team, and organizer clustering."
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="flex flex-col min-h-screen bg-[#0A0A0A] text-white antialiased selection:bg-cyber-yellow selection:text-black">
        <AuthProvider>
          <HeaderHUD
            onOpenJuryMode={() => setIsJuryTourOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />
          
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>

          <Footer />

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onLaunchJuryMode={() => setIsJuryTourOpen(true)}
          />

          <JuryTourModal
            isOpen={isJuryTourOpen}
            onClose={() => setIsJuryTourOpen(false)}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
