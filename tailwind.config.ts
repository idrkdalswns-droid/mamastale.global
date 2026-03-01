import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--cream) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        "warm-ivory": "rgb(var(--warm-ivory) / <alpha-value>)",
        peach: "rgb(var(--peach) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        "mint-deep": "rgb(var(--mint-deep) / <alpha-value>)",
        lavender: "rgb(var(--lavender) / <alpha-value>)",
        purple: "rgb(var(--purple) / <alpha-value>)",
        brown: {
          DEFAULT: "rgb(var(--brown) / <alpha-value>)",
          light: "rgb(var(--brown-light) / <alpha-value>)",
          mid: "rgb(var(--brown-mid) / <alpha-value>)",
          pale: "rgb(var(--brown-pale) / <alpha-value>)",
        },
        kakao: "rgb(var(--kakao) / <alpha-value>)",
        "kakao-brown": "rgb(var(--kakao-brown) / <alpha-value>)",
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
