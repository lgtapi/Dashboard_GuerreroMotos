import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: {
          900: "#0d0d0d",
          800: "#161616",
          700: "#1f1f1f",
          600: "#2a2a2a",
        },
        paper: "#f7f7f5",
        brand: {
          DEFAULT: "#ff5803",
          light: "#ff7a33",
          dim: "#cc4602",
          glow: "#ff5803",
        },
        yellow: {
          DEFAULT: "#ffb23c",
        },
        teal: {
          DEFAULT: "#3fd6c6",
        },
        up: "#4ade80",
        down: "#fb5a5a",
        line: "#2c2c2c",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #ff5803 0%, #ff8a3d 100%)",
        "brand-radial": "radial-gradient(circle at 30% 20%, rgba(255,88,3,0.25), transparent 60%)",
      },
      boxShadow: {
        brand: "0 8px 30px -8px rgba(255,88,3,0.45)",
      },
      fontFamily: {
        display: [
          "'Barlow Condensed'",
          "'Oswald'",
          "'Arial Narrow'",
          "sans-serif",
        ],
        sans: [
          "'Inter'",
          "-apple-system",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
