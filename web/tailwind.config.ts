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
        // Forest greens
        forest: {
          950: "#0f2019",
          900: "#1a3a2a",
          800: "#22472f",
          700: "#2d6a4f",
          600: "#3a8a64",
          500: "#4aab7d",
        },
        // Earth tones
        earth: {
          700: "#6b4226",
          600: "#8b5e3c",
          500: "#a8743d",
          400: "#c4a35a",
          300: "#d4b87a",
          200: "#e8d5a8",
        },
        // Parchment backgrounds
        parchment: {
          DEFAULT: "#f5f0e8",
          50:  "#faf8f4",
          100: "#f5f0e8",
          200: "#ede4d2",
          300: "#e0d2b8",
        },
        // Risk tier colors (muted, earthy — no neon)
        risk: {
          safe:   "#2d6a4f",  // forest green
          low:    "#c4a35a",  // amber/gold
          medium: "#8b5e3c",  // terracotta brown
          high:   "#7a1f1f",  // deep red
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        warm:   "0 2px 12px 0 rgba(139, 94, 60, 0.12)",
        "warm-lg": "0 8px 32px 0 rgba(139, 94, 60, 0.16)",
        panel:  "0 1px 4px 0 rgba(26, 58, 42, 0.08), 0 4px 16px 0 rgba(26, 58, 42, 0.06)",
      },
      borderRadius: {
        panel: "10px",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #1a3a2a 0%, #2d6a4f 50%, #22472f 100%)",
        "card-gradient":
          "linear-gradient(160deg, rgba(245,240,232,0.95) 0%, rgba(237,228,210,0.8) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
