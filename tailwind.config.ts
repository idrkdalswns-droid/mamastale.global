import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF5EC",
        paper: "#FEF7ED",
        "warm-ivory": "#F9F1E6",
        peach: "#E8A87C",
        coral: "#E07A5F",
        mint: "#B8D8D0",
        "mint-deep": "#7FBFB0",
        lavender: "#C8B8D8",
        purple: "#6D4C91",
        brown: {
          DEFAULT: "#5A3E2B",
          light: "#8B6F55",
          mid: "#A08060",
          pale: "#C4A882",
        },
        kakao: "#FEE500",
        "kakao-brown": "#3C1E1E",
      },
      fontFamily: {
        serif: ["'Nanum Myeongjo'", "'Noto Serif KR'", "Georgia", "serif"],
        sans: ["'Noto Sans KR'", "'Apple SD Gothic Neo'", "sans-serif"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          from: { opacity: "0", transform: "scale(0.88)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        msgSlide: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        dotBounce: {
          "0%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease",
        "fade-up": "fadeUp 0.6s ease",
        "scale-up": "scaleUp 0.45s ease",
        "msg-slide": "msgSlide 0.35s ease both",
        "dot-bounce": "dotBounce 1.2s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
