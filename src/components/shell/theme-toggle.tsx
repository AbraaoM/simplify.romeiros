"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const ready = useHasMounted();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="min-h-11 px-1 text-sm"
      aria-label={
        ready ? (dark ? "Usar tema claro" : "Usar tema escuro") : "Mudar tema"
      }
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {ready ? (dark ? "Claro" : "Escuro") : "Tema"}
    </button>
  );
}
