import { useRouter as useExpoRouter, Href } from "expo-router";
import { useCallback } from "react";

// Global navigation timestamp lock across the whole app
let globalLastNavigationTime = 0;
const GLOBAL_NAVIGATION_THROTTLE_MS = 500;

/**
 * useSafeRouter wraps Expo Router's useRouter with a global cooldown lock (500ms).
 * If a button or card is tapped twice in rapid succession, only the first navigation
 * request executes, completely preventing duplicate screens on the stack.
 */
export function useSafeRouter() {
  const router = useExpoRouter();

  const safePush = useCallback(
    (href: Href, options?: any) => {
      const now = Date.now();
      if (now - globalLastNavigationTime < GLOBAL_NAVIGATION_THROTTLE_MS) {
        return;
      }
      globalLastNavigationTime = now;
      router.push(href as any, options);
    },
    [router]
  );

  const safeReplace = useCallback(
    (href: Href, options?: any) => {
      const now = Date.now();
      if (now - globalLastNavigationTime < GLOBAL_NAVIGATION_THROTTLE_MS) {
        return;
      }
      globalLastNavigationTime = now;
      router.replace(href as any, options);
    },
    [router]
  );

  const safeBack = useCallback(() => {
    const now = Date.now();
    if (now - globalLastNavigationTime < GLOBAL_NAVIGATION_THROTTLE_MS) {
      return;
    }
    globalLastNavigationTime = now;
    router.back();
  }, [router]);

  return {
    ...router,
    push: safePush,
    replace: safeReplace,
    back: safeBack,
  };
}
