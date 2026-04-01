import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          border: "rgba(255, 255, 255, 0.1)",
          highlight: "rgba(255, 255, 255, 0.15)",
        },
      },
      boxShadow: {
        "glass-inner": "inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.5)",
        "glass-outer": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "floating": "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 255, 255, 0.05)",
        "neon": "0 0 10px var(--primary), 0 0 20px var(--primary-dark)",
      },
      backgroundImage: {
        "space-gradient": "linear-gradient(to bottom right, #0f172a, #020617)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
