import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  getConversationTitle,
  loadConversations,
  saveConversations,
} from "../utils/conversation";

export function useConversations() {
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(() => conversations[0]?.id);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    conversationsRef.current = conversations;
    const timeoutId = window.setTimeout(() => saveConversations(conversations), 250);
    return () => window.clearTimeout(timeoutId);
  }, [conversations]);

  useEffect(() => {
    function flushConversations() {
      saveConversations(conversationsRef.current);
    }

    window.addEventListener("beforeunload", flushConversations);
    return () => {
      flushConversations();
      window.removeEventListener("beforeunload", flushConversations);
    };
  }, []);

  const patchConversation = useCallback((conversationId, patcher) => {
    setConversations((items) =>
      items.map((item) => {
        if (item.id !== conversationId) return item;
        const next = patcher(item);
        return {
          ...next,
          title: getConversationTitle(next.messages),
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const startNewConversation = useCallback((providedConversation) => {
    const conversation = providedConversation || createConversation();
    setConversations((items) => [conversation, ...items]);
    setActiveId(conversation.id);
    return conversation;
  }, []);

  const deleteConversation = useCallback((conversationId) => {
    setConversations((items) => {
      const remaining = items.filter((item) => item.id !== conversationId);
      if (!remaining.length) {
        setActiveId(undefined);
        return [];
      }

      setActiveId((currentId) => (currentId === conversationId ? remaining[0].id : currentId));
      return remaining;
    });
  }, []);

  return {
    activeId,
    conversations,
    deleteConversation,
    patchConversation,
    setActiveId,
    startNewConversation,
  };
}
