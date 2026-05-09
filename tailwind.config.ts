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
          950: "#05111F",
          900: "#091929",
          800: "#0E2640",
          700: "#163452",
          600: "#1E4468",
        },
        accent: {
          DEFAULT: "#F0A500",
          dark:    "#D08E00",
          light:   "#FFBE3D",
        },
        steel:   "#7A90A8",
        surface: "#F5F7FA",
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["IBM Plex Sans", "Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      fontWeight: {
        "300": "300", "400": "400", "500": "500",
        "600": "600", "700": "700", "800": "800", "900": "900",
      },
      borderRadius: {
        "xl":  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "ticker":    "ticker 50s linear infinite",
        "fade-up":   "fadeUp 0.35s ease forwards",
        "fade-in":   "fadeIn 0.25s ease forwards",
        "slide-down":"slideDown 0.25s ease forwards",
      },
      keyframes: {
        ticker:    { from: { transform:"translateX(0)" }, to: { transform:"translateX(-50%)" } },
        fadeUp:    { from: { opacity:"0", transform:"translateY(10px)" }, to: { opacity:"1", transform:"translateY(0)" } },
        fadeIn:    { from: { opacity:"0" },                               to: { opacity:"1" } },
        slideDown: { from: { opacity:"0", transform:"translateY(-8px)" }, to: { opacity:"1", transform:"translateY(0)" } },
      },
      boxShadow: {
        "card":   "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-lg":"0 4px 16px 0 rgb(0 0 0 / 0.08), 0 1px 4px -1px rgb(0 0 0 / 0.06)",
        "accent": "0 0 0 3px rgb(240 165 0 / 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
