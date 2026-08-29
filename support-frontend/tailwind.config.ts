import type { Config } from "tailwindcss";

/** Wrap an HSL channel CSS variable so opacity modifiers work (e.g. bg-primary/10). */
function withOpacity(variable: string) {
  return `hsl(var(${variable}) / <alpha-value>)`;
}

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        surface: {
          DEFAULT: withOpacity("--surface"),
          muted: withOpacity("--surface-muted"),
        },
        foreground: withOpacity("--foreground"),
        muted: {
          foreground: withOpacity("--muted-foreground"),
        },
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        primary: {
          DEFAULT: withOpacity("--primary"),
          hover: withOpacity("--primary-hover"),
          foreground: withOpacity("--primary-foreground"),
          soft: withOpacity("--primary-soft"),
          "soft-foreground": withOpacity("--primary-soft-foreground"),
        },
        success: {
          DEFAULT: withOpacity("--success"),
          soft: withOpacity("--success-soft"),
        },
        warning: {
          DEFAULT: withOpacity("--warning"),
          soft: withOpacity("--warning-soft"),
        },
        danger: {
          DEFAULT: withOpacity("--danger"),
          soft: withOpacity("--danger-soft"),
        },
        info: {
          DEFAULT: withOpacity("--info"),
          soft: withOpacity("--info-soft"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.25rem)",
        sm: "calc(var(--radius) - 0.5rem)",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.12)",
        popover: "0 8px 32px -8px rgb(0 0 0 / 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
