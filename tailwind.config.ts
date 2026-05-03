import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#06101E",
          900: "#0B1A2E",
          800: "#112540",
          700: "#1A3558",
          600: "#234770",
        },
        accent: {
          DEFAULT: "#E8A020",
          dark:    "#C8841A",
          light:   "#F0C050",
        },
        steel: "#8094B0",
        success: "#16A34A",
        danger:  "#DC2626",
        warning: "#D97706",
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-barlow)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        ticker:   "ticker 40s linear infinite",
        "fade-up":"fadeUp 0.4s ease forwards",
        "slide-in":"slideIn 0.3s ease forwards",
      },
      keyframes: {
        ticker: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
