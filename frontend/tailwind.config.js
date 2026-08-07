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
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            filter: "brightness(1)",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.85",
            filter: "brightness(1.15)",
            transform: "scale(1.02)",
          },
        },
        "spring-hover": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.1) translateY(-5px)" },
          "70%": { transform: "scale(1.02) translateY(2px)" },
          "100%": { transform: "scale(1.05) translateY(0)" },
        },
      },
      animation: {
        "spring-fade-up":
          "spring-fade-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "spring-scale":
          "spring-scale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        float: "float 3s ease-in-out infinite",
        "slide-in-right":
          "slide-in-right 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "slide-in-left":
          "slide-in-left 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spring-hover":
          "spring-hover 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      },
    },
  },
  plugins: [],
};
