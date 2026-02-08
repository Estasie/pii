import { useState, useCallback } from "react";

export function useReveal(startHidden: boolean = false) {
  const [isRevealed, setIsRevealed] = useState(!startHidden);

  const reveal = useCallback(() => {
    setIsRevealed(true);
  }, []);

  return {
    isRevealed,
    reveal,
  };
}
