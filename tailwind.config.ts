import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        surface: "#111111",
        edge: "#1f1f1f",
        lime: "#c6f432",
        neon: "#eaff6b",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseRing: { "0%": { transform: "scale(.85)", opacity: "0.9" }, "100%": { transform: "scale(1.8)", opacity: "0" } },
      },
      animation: { floaty: "floaty 4s ease-in-out infinite", pulseRing: "pulseRing 1.8s ease-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
