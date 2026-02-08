import { useEffect, useRef } from "react";
import { CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Message } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { usePIIDetection } from "@/hooks/usePIIDetection";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  conversationId: string | null;
}

export const ChatMessages = ({
  messages,
  isLoading,
  conversationId,
}: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getProcessedContent } = usePIIDetection(conversationId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="text-muted-foreground">
            <h2 className="text-2xl font-semibold mb-2">Welcome to AI Chat</h2>
            <p className="text-sm mb-4">
              Start a new conversation by typing a message below
            </p>
            <p className="text-xs text-muted-foreground/70">
              Your conversation will be automatically saved and appear in the
              sidebar
            </p>
          </div>
        </div>
      ) : (
        messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            displayContent={getProcessedContent(index, message.content)}
            isHistorical={true}
          />
        ))
      )}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </CardContent>
  );
};
