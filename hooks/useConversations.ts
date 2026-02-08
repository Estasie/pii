import { useState, useCallback, useEffect } from "react";

export interface ConversationSummary {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/conversations-sqlite");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(
    async (title?: string) => {
      try {
        const response = await fetch("/api/conversations-sqlite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });

        if (response.ok) {
          const newConversation = await response.json();
          await fetchConversations();
          return newConversation._id;
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
      return null;
    },
    [fetchConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/conversations-sqlite/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await fetchConversations();
          return true;
        }
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
      return false;
    },
    [fetchConversations],
  );

  useEffect(() => {
    fetchConversations();

    // Poll conversations every 5 seconds
    const interval = setInterval(() => {
      fetchConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    fetchConversations,
    createConversation,
    deleteConversation,
  };
}
