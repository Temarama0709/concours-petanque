const defaultTheme = require("tailwindcss/defaultTheme");

// Thème « Club » : bleu marine et jaune
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#12284A", dark: "#0A1830", line: "#3A5078", soft: "#C9D3E3" },
        jaune: { DEFAULT: "#F5B700", dark: "#D9A200", clair: "#FFF1C2", texte: "#5C4500" },
        ardoise: "#4F5B6E", // texte secondaire
        bord: "#E3E7EE",
        fond: "#F2F4F8"
      },
      fontFamily: {
        sans: ["Archivo", ...defaultTheme.fontFamily.sans]
      }
    }
  },
  plugins: []
};
