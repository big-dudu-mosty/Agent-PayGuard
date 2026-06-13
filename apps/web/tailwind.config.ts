import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "#f6f9fb",
        ink: "#0f172a",
        muted: "#64748b",
        line: "#dce7ed",
        panel: "#f4f8fa",
        brandSky: "#0e91b8",
        brandMint: "#169c78",
        danger: "#e85b61",
        mantle: "#00d395",
      },
      fontFamily: {
        body: ["var(--font-manrope)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
