"use client";

import { useReveal } from "@/hooks/useReveal";
import { Spoiler } from "spoiled";

interface PIISpoilerProps {
  originalText: string;
  type: string;
  isHistorical?: boolean;
}

export const PIISpoiler = ({
  originalText,
  type,
  isHistorical = false,
}: PIISpoilerProps) => {
  const { isRevealed, reveal } = useReveal(isHistorical);

  return (
    <span className="relative inline-block">
      {isRevealed ? (
        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
          {originalText}
        </span>
      ) : (
        <Spoiler onClick={reveal} title={`Click to reveal ${type}`}>
          {originalText}
        </Spoiler>
      )}
    </span>
  );
};
