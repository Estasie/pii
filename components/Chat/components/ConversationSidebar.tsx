import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { ConversationSummary } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export const ConversationSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) => {
  return (
    <div className="w-64 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={onNewConversation} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation._id}
              className={cn(
                "group flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors",
                currentConversationId === conversation._id && "bg-accent",
              )}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={() => onSelectConversation(conversation._id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{conversation.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conversation._id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
