/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F5FB",
        primary: {
          DEFAULT: "#C084FC",
          light: "#E9D5FF",
          dark: "#9333EA",
          subtle: "#FAF5FF",
        },
        success: {
          DEFAULT: "#50F2C8",
          light: "#D1FAE5",
          dark: "#059669",
          subtle: "#ECFDF5",
        },
        danger: {
          DEFAULT: "#FF96A8",
          light: "#FFE4E6",
          dark: "#E11D48",
          subtle: "#FFF1F2",
        },
        bj3: {
          bg: "#F8F5FB",
          card: "#FFFFFF",
          border: "#EFE8F6",
          text: "#332941",
          muted: "#7B708A",
          accent: "#A855F7",
        },
      },
      boxShadow: {
        pastel: "0 8px 30px rgba(192, 132, 252, 0.12)",
        "pastel-sm": "0 4px 15px rgba(192, 132, 252, 0.08)",
        "pastel-card": "0 10px 25px -5px rgba(147, 51, 234, 0.05), 0 8px 10px -6px rgba(147, 51, 234, 0.05)",
      },
      fontFamily: {
        sans: [
          "Prompt",
          "Sarabun",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
