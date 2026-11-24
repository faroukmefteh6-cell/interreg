import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), ink: v("ink"), muted: v("muted"), line: v("line"),
        accent: v("accent"), "accent-soft": v("accent-soft"),
        env: v("env"), soc: v("soc"), eco: v("eco"), leg: v("leg"), tec: v("tec"),
        "env-soft": v("env-soft"), "soc-soft": v("soc-soft"), "eco-soft": v("eco-soft"),
        "leg-soft": v("leg-soft"), "tec-soft": v("tec-soft"),
        ok: v("ok"), warn: v("warn"), bad: v("bad"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
