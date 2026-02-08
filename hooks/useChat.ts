import { useState, useCallback, useRef, useEffect } from "react";
import { PIIMarker } from "@/lib/piiDetection";

export interface Message {
  role: "user" | "assistant";
  content: string;
  piiMarkers?: PIIMarker[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function useChat(conversationId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
      setCurrentConversationId(conversationId);
    } else if (conversationId === null && currentConversationId !== null) {
      // Only clear if we're explicitly switching to null from a non-null value
      setMessages([]);
      setTokenUsage(null);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations-sqlite/${id}`);
      if (response.ok) {
        const conversation = await response.json();

        // Fetch PII markers for this conversation
        const piiResponse = await fetch(
          `/api/pii-detection-sqlite?conversationId=${id}`,
        );
        let piiData: any[] = [];
        if (piiResponse.ok) {
          piiData = await piiResponse.json();
        }

        // Map PII markers to messages
        const messagesWithPII = (conversation.messages || []).map(
          (msg: Message, index: number) => {
            const piiInfo = piiData.find((p: any) => p.message_index === index);
            return {
              ...msg,
              piiMarkers: piiInfo?.piiMarkers || [],
            };
          },
        );

        setMessages(messagesWithPII);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const saveConversation = async (
    updatedMessages: Message[],
    conversationId: string,
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/conversations-sqlite/${conversationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
        },
      );
      return response.ok;
    } catch (error) {
      console.error("Error saving conversation:", error);
      return false;
    }
  };

  const sendMessage = useCallback(
    async (onConversationCreated?: (id: string) => void) => {
      if (!input.trim() || isLoading) return;

      const userMessage: Message = { role: "user", content: input };
      const newMessages = [...messages, userMessage];

      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      // Create new conversation if none exists
      let conversationIdToUse = currentConversationId;
      if (!conversationIdToUse) {
        try {
          const response = await fetch("/api/conversations-sqlite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New Conversation" }),
          });

          if (response.ok) {
            const newConversation = await response.json();
            conversationIdToUse = newConversation._id;
            setCurrentConversationId(conversationIdToUse);
            if (conversationIdToUse) {
              onConversationCreated?.(conversationIdToUse);
            }
          }
        } catch (error) {
          console.error("Error creating conversation:", error);
        }
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: newMessages }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let piiMarkers: PIIMarker[] = [];
        const allPIIMarkers: PIIMarker[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.content) {
                    assistantMessage += data.content;
                    setMessages([
                      ...newMessages,
                      {
                        role: "assistant",
                        content: assistantMessage,
                        piiMarkers: allPIIMarkers,
                      },
                    ]);
                  }

                  if (data.usage) {
                    setTokenUsage(data.usage);
                  }

                  // Handle chunked PII detection (deterministic/regex-based)
                  if (data.piiChunk && data.piiChunk.markers) {
                    // Add new markers from this chunk
                    const newMarkers = data.piiChunk.markers;

                    // Merge with existing markers, avoiding duplicates
                    for (const marker of newMarkers) {
                      const isDuplicate = allPIIMarkers.some(
                        (existing) =>
                          existing.startIndex === marker.startIndex &&
                          existing.endIndex === marker.endIndex,
                      );
                      if (!isDuplicate) {
                        allPIIMarkers.push(marker);
                      }
                    }

                    // Update UI immediately with new PII markers
                    setMessages([
                      ...newMessages,
                      {
                        role: "assistant",
                        content: assistantMessage,
                        piiMarkers: [...allPIIMarkers],
                      },
                    ]);
                  }

                  // Handle final PII detection (deterministic + LLM-based)
                  if (data.piiDetection) {
                    piiMarkers = data.piiDetection.piiMarkers || [];
                    // Update the message with final PII markers
                    setMessages([
                      ...newMessages,
                      {
                        role: "assistant",
                        content: assistantMessage,
                        piiMarkers,
                      },
                    ]);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        // Save conversation after successful response
        if (conversationIdToUse) {
          const finalMessages = [
            ...newMessages,
            {
              role: "assistant" as const,
              content: assistantMessage,
              piiMarkers,
            },
          ];

          // Try to save, but continue even if it fails
          const saved = await saveConversation(
            finalMessages,
            conversationIdToUse,
          );

          if (saved) {
            // Only trigger PII detection if save was successful
            finalMessages.forEach((msg, index) => {
              fetch("/api/pii-detection-sqlite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conversationId: conversationIdToUse,
                  messageIndex: index,
                  role: msg.role,
                  content: msg.content,
                }),
              }).catch((err) => console.error("PII detection failed:", err));
            });
          } else {
            console.warn(
              "Conversation not saved to database, continuing without persistence",
            );
          }
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted");
        } else {
          console.error("Error sending message:", error);
          setMessages([
            ...newMessages,
            {
              role: "assistant",
              content: "Sorry, an error occurred. Please try again.",
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [input, messages, isLoading, currentConversationId],
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTokenUsage(null);
  }, []);

  return {
    messages,
    input,
    setInput,
    isLoading,
    tokenUsage,
    currentConversationId,
    setCurrentConversationId,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadConversation,
  };
}
