import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "ag-bg": "#0d1117",
        "ag-surface": "#161b22",
        "ag-border": "#30363d",
        "ag-accent": "#58a6ff",
        "ag-text": "#e6edf3",
        "ag-muted": "#8b949e",
        "ag-user": "#1f3a5f",
        "ag-agent": "#1a2332",
        "ag-success": "#3fb950",
        "ag-warning": "#d2991d",
        "ag-error": "#f85149",
      },
    },
  },
  plugins: [],
};
export default config;
