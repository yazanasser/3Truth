/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: ["./*.html", "./js/**/*.js"],
  },
  safelist: ["translate-x-full", "flex"],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      colors: {
        // Deep Obsidian Backgrounds
        slate: {
          950: "#031F1A",
          900: "#06352D",
          800: "#0A4D41",
          700: "#0F6B5A",
          300: "#CBD5E1",
          50: "#F8FAFC",
        },
        // Accent Colors
        forensic: {
          cyan: "#2FEECC",
          emerald: "#10B981",
          rose: "#EF4444",
          violet: "#8B5CF6",
        },
      },
      keyframes: {
        "spring-fade-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spring-scale": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "spring-fade-up":
          "spring-fade-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "spring-scale":
          "spring-scale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "slide-in-right":
          "slide-in-right 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "slide-in-left":
          "slide-in-left 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "pulse-slow": "pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scanline: "scanline 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
