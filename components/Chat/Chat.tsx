"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./components/ChatHeader";
import { ChatMessages } from "./components/ChatMessages";
import { ChatInput } from "./components/ChatInput";
import { ConversationSidebar } from "./components/ConversationSidebar";

export const Chat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("conversation");

  // Initialize with URL parameter or null
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(() => conversationIdFromUrl);

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (conversationIdFromUrl !== selectedConversationId) {
      setSelectedConversationId(conversationIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIdFromUrl]);

  const {
    conversations,
    isLoading: conversationsLoading,
    createConversation,
    deleteConversation,
  } = useConversations();

  const {
    messages,
    input,
    setInput,
    isLoading,
    tokenUsage,
    currentConversationId,
    sendMessage,
    stopGeneration,
    clearMessages,
  } = useChat(selectedConversationId);

  const handleNewConversation = async () => {
    const newId = await createConversation();
    if (newId) {
      setSelectedConversationId(newId);
    }
  };

  const handleSendMessage = () => {
    sendMessage((newConversationId) => {
      setSelectedConversationId(newConversationId);
      router.push(`/?conversation=${newConversationId}`);
    });
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    router.push(`/?conversation=${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    const success = await deleteConversation(id);
    if (success && id === selectedConversationId) {
      // Clear the selected conversation and reset to initial state
      setSelectedConversationId(null);
      router.push("/");
    }
  };

  // Определяем, является ли чат новым (нет ID разговора)
  const isNewChat = !currentConversationId;

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col m-4">
          <ChatHeader
            tokenUsage={tokenUsage}
            hasMessages={messages.length > 0}
            isLoading={isLoading}
            onClear={clearMessages}
            isNewChat={isNewChat}
          />
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            conversationId={currentConversationId}
          />
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSubmit={handleSendMessage}
            onStop={stopGeneration}
          />
        </Card>
      </div>
    </div>
  );
};
