/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Iowan Old Style', 'Palatino Linotype', 'Georgia', 'serif'],
        body: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "42%": { opacity: "0.72" },
          "45%": { opacity: "1" },
          "78%": { opacity: "0.85" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.08)" },
        },
      },
      animation: {
        scan: "scan 2.4s linear infinite",
        flicker: "flicker 3.5s ease-in-out infinite",
        "spin-slow": "spin-slow 26s linear infinite",
        "spin-reverse": "spin-reverse 40s linear infinite",
        breathe: "breathe 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
