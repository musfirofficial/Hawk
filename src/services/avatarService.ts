import { boring } from "boring-avatars-vanilla";

export const AVATAR_THEME_COLORS = [
  "#D4F938", // brand accent (lime)
  "#38BDF8", // transfer (sky blue)
  "#F43F5E", // expense (coral red)
  "#A855F7", // borrow (purple)
  "#F59E0B", // lend (amber gold)
];

/**
 * Deterministically generates an SVG avatar using the app theme colors.
 */
export function generateContactAvatar(name: string, size: number = 44): string {
  const safeName = (name || "Contact").trim();
  try {
    return boring({
      name: safeName,
      variant: "beam",
      colors: AVATAR_THEME_COLORS,
      size,
    });
  } catch (err) {
    console.warn("Failed to generate boring avatar:", err);
    return "";
  }
}
