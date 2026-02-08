import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { TokenUsage } from "@/hooks/useChat";

interface ChatHeaderProps {
  tokenUsage: TokenUsage | null;
  hasMessages: boolean;
  isLoading: boolean;
  onClear: () => void;
}

export const ChatHeader = ({
  tokenUsage,
  hasMessages,
  isLoading,
  onClear,
}: ChatHeaderProps) => {
  return (
    <CardHeader className="border-b">
      <div className="flex items-center justify-between">
        <CardTitle>Chat with AI</CardTitle>
        <div className="flex items-center gap-2">
          {tokenUsage && (
            <div className="flex gap-2">
              <Badge variant="outline">Prompt: {tokenUsage.promptTokens}</Badge>
              <Badge variant="outline">
                Completion: {tokenUsage.completionTokens}
              </Badge>
              <Badge variant="default">Total: {tokenUsage.totalTokens}</Badge>
            </div>
          )}
          {hasMessages && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  );
};
