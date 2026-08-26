import type { Config } from "tailwindcss";

/**
 * LT-FaultX design system — "Green & Black" control-room theme.
 *
 * Base UI is near-black with phosphor-green accents (classic monitoring / SCADA feel).
 * Functional STATUS colors (red/yellow/blue/gray) are preserved separately because the
 * accessibility rule forbids communicating status by color alone AND requires faults to
 * remain unmistakably red, maintenance yellow, etc.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Brand / green+black surfaces ---
        ink: {
          950: "#050705", // deepest background (near-black, faint green tint)
          900: "#0a0f0b",
          800: "#0f1712",
          700: "#16211a",
          600: "#1e2d23",
          500: "#2a3d31",
        },
        // Primary phosphor green (brand accent)
        brand: {
          50: "#e9fff2",
          100: "#c9ffdf",
          200: "#93ffbf",
          300: "#54fb98",
          400: "#22e874",
          500: "#00c853", // primary
          600: "#00a344",
          700: "#068038",
          800: "#0b6430",
          900: "#0c5228",
          950: "#022e15",
        },
        // --- Functional status palette (do not repurpose) ---
        status: {
          normal: "#22e874", // green  — NORMAL / available
          fault: "#ff3b3b", // red    — FAULT / outage
          maint: "#ffc043", // yellow — MAINTENANCE
          info: "#3b9bff", // blue   — INFORMATION
          unknown: "#8b9a91", // gray  — UNKNOWN / stale
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,200,83,0.25), 0 0 24px -6px rgba(0,200,83,0.35)",
        "glow-fault": "0 0 0 1px rgba(255,59,59,0.3), 0 0 24px -4px rgba(255,59,59,0.45)",
        card: "0 1px 0 rgba(255,255,255,0.03), 0 8px 24px -12px rgba(0,0,0,0.8)",
      },
      keyframes: {
        "pulse-fault": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(255,59,59,0.55)" },
          "50%": { opacity: "0.75", boxShadow: "0 0 0 10px rgba(255,59,59,0)" },
        },
        "pulse-maint": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(255,192,67,0.55)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 0 10px rgba(255,192,67,0)" },
        },
        "grid-flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "40px 40px" },
        },
      },
      animation: {
        "pulse-fault": "pulse-fault 1.4s ease-in-out infinite",
        "pulse-maint": "pulse-maint 1.8s ease-in-out infinite",
        "grid-flow": "grid-flow 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
