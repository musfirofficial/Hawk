/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
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
  plugins: [],
};
