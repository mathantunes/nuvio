"use client";

import { useEffect } from "react";

/** Prevents scroll wheel from accidentally changing number input values. */
export function NumberInputFix() {
  useEffect(() => {
    function onWheel() {
      if (
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    }
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
