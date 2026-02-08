import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useChat";
import { PIISpoiler } from "./PIISpoiler";

interface ChatMessageProps {
  message: Message;
  displayContent?: string;
  isHistorical?: boolean;
}

export const ChatMessage = ({
  message,
  displayContent,
  isHistorical = false,
}: ChatMessageProps) => {
  const content = displayContent || message.content;
  const hasPII = message.piiMarkers && message.piiMarkers.length > 0;

  // Function to render content with PII spoilers
  const renderContentWithSpoilers = () => {
    if (!hasPII || !message.piiMarkers) {
      return content;
    }

    // Use original content for rendering, not processed content
    const originalContent = message.content;

    // Sort markers by startIndex to process them in order
    const sortedMarkers = [...message.piiMarkers].sort(
      (a, b) => a.startIndex - b.startIndex,
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedMarkers.forEach((marker, index) => {
      // Add text before the marker from original content
      if (marker.startIndex > lastIndex) {
        parts.push(originalContent.substring(lastIndex, marker.startIndex));
      }

      // Add the spoiler component
      parts.push(
        <PIISpoiler
          key={`pii-${index}`}
          originalText={marker.originalValue}
          type={marker.type}
          isHistorical={isHistorical}
        />,
      );

      lastIndex = marker.endIndex;
    });

    // Add remaining text after the last marker from original content
    if (lastIndex < originalContent.length) {
      parts.push(originalContent.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div
      className={cn(
        "flex",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {renderContentWithSpoilers()}
        </p>
        {hasPII && (
          <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>Contains PII</span>
          </div>
        )}
      </div>
    </div>
  );
};
