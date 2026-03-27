import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        foreground: "#EDEDED",
        card: {
          DEFAULT: "#111111",
          foreground: "#EDEDED",
        },
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        accent: "#8B5CF6",
        muted: {
          DEFAULT: "#6B7280",
          foreground: "#9CA3AF",
        },
        border: "#27272A",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
