import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        textPrimary: "var(--text)",
        textSecondary: "var(--textSecondary)",
        borderCustom: "var(--border)",
        accent: "var(--accent)",
        accentText: "var(--accentText)",
        navy: "var(--navy)",
        success: "var(--success)",
        danger: "var(--danger)",
      },
      transitionDuration: {
        motion: "200ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
