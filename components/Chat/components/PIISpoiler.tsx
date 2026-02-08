"use client";

import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

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
        <button
          onClick={reveal}
          className={cn(
            "relative inline-block cursor-pointer overflow-hidden",
            "transition-all duration-200 hover:opacity-80",
            "bg-gray-200/50 dark:bg-gray-700/50 backdrop-blur-sm rounded",
          )}
          style={{
            width: `${originalText.length * 0.6}em`,
            minWidth: "3em",
            height: "1.2em",
          }}
          title={`Click to reveal ${type}`}
        >
          <span className="invisible">{originalText}</span>
          <span className="absolute inset-0 pii-dots-animation" />
        </button>
      )}
    </span>
  );
};
