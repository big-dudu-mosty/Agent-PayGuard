import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        line: "#d1d5db",
        panel: "#f8fafc",
        mantle: "#00d395",
      },
    },
  },
  plugins: [],
};

export default config;

