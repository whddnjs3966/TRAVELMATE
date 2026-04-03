import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0066FF",
          light: "#E8F1FF",
        },
        secondary: "#FF6B35",
        surface: "#FFFFFF",
        background: "#FAFAFA",
        border: "#E5E7EB",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B7280",
        "text-tertiary": "#9CA3AF",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["17px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", fontWeight: "400" }],
        overline: ["11px", { lineHeight: "1.3", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};

export default config;
