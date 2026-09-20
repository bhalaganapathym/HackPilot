import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        fill: {
          DEFAULT: "var(--fill)",
          hover: "var(--fill-hover)",
        },
        border: "var(--border)",
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          tertiary: "var(--text-tertiary)",
        },
        "cyber-yellow": {
          DEFAULT: "#FDE047",
          hover: "#FACC15",
          muted: "#FEF08A",
          dark: "#EAB308",
        },
        void: {
          onyx: "#0A0A0A",
          charcoal: "#171717",
          gray: "#262626",
          light: "#333333",
        },
        accent: {
          blue: "var(--accent-blue)",
          amber: "var(--accent-amber)",
          coral: "var(--accent-coral)",
          green: "var(--accent-green)",
          violet: "var(--accent-violet)",
          yellow: "#FDE047",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
        "glass": "32px",
        "liquid": "100px",
        "wave-br": "120px",
        "wave-bl": "40px",
      },
      boxShadow: {
        card: "var(--card-shadow)",
        popover: "var(--popover-shadow)",
        "glass-2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
        "yellow-glow": "0 0 40px -8px rgba(253, 224, 71, 0.45)",
      },
      animation: {
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "floatSlow 9s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(0.5deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
