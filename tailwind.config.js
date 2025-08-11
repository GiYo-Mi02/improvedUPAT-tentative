/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e8f3ee",
          100: "#cfe7de",
          200: "#a4d1c0",
          300: "#79baa1",
          400: "#4ea382",
          500: "#288a67",
          600: "#1f6d52",
          700: "#195740",
          800: "#144334",
          900: "#123424",
        },
        luxury: {
          gold: "#febc01", // yellow highlight
          champagne: "#cdcece", // gray per request, used for subtle text/accents
          deep: "#0b1f18", // deep greenish background
          night: "#123424", // main green as dark tone
          accent: "#26a269", // supportive green accent
          black: "#0b0b0b",
          white: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
        display: ["Marcellus", "serif"],
        heading: ["Marcellus", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
