/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["DMSans_400Regular"],
        regular: ["DMSans_400Regular"],
        medium: ["DMSans_500Medium"],
        semibold: ["DMSans_600SemiBold"],
        bold: ["DMSans_700Bold"],
        extrabold: ["DMSans_800ExtraBold"],
        black: ["DMSans_900Black"],
      },
      colors: {
        dark: {
          bg: "#0B0D12",
          surface: "#141720",
          card: "#1B1F2B",
          cardHover: "#232838",
          border: "#262B3A",
          muted: "#60677C",
          text: "#F8FAFC",
          textSecondary: "#94A3B8",
        },
        brand: {
          accent: "#D4F938", // Electric Lime from the design hero card
          accentDark: "#0B0D12",
          income: "#22C55E", // Vibrant green for received/income
          expense: "#F43F5E", // Vibrant coral red for expenses
          transfer: "#38BDF8", // Sky blue for transfers
          lend: "#F59E0B", // Amber gold for debts/loans
          borrow: "#A855F7", // Purple for borrowings
        },
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
    },
  },
  plugins: [
    ({ addUtilities }) => {
      addUtilities({
        ".font-sans": {
          fontFamily: "DMSans_400Regular",
          fontWeight: "normal",
        },
        ".font-regular": {
          fontFamily: "DMSans_400Regular",
          fontWeight: "normal",
        },
        ".font-normal": {
          fontFamily: "DMSans_400Regular",
          fontWeight: "normal",
        },
        ".font-light": {
          fontFamily: "DMSans_400Regular",
          fontWeight: "normal",
        },
        ".font-thin": {
          fontFamily: "DMSans_400Regular",
          fontWeight: "normal",
        },
        ".font-medium": {
          fontFamily: "DMSans_500Medium",
          fontWeight: "normal",
        },
        ".font-semibold": {
          fontFamily: "DMSans_600SemiBold",
          fontWeight: "normal",
        },
        ".font-bold": {
          fontFamily: "DMSans_700Bold",
          fontWeight: "normal",
        },
        ".font-extrabold": {
          fontFamily: "DMSans_800ExtraBold",
          fontWeight: "normal",
        },
        ".font-black": {
          fontFamily: "DMSans_900Black",
          fontWeight: "normal",
        },
      });
    },
  ],
};
