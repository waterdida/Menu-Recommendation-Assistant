import { useEffect, useMemo, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import Sidebar from "./components/Sidebar";
import { examples } from "./constants/chat";
import { useConversations } from "./hooks/useConversations";
import { createConversation, createId } from "./utils/conversation";
import { exportConversationAsPdf } from "./utils/exportPdf";
import { parseEventStream } from "./utils/sse";

export default function App() {
  const {
    activeId,
    conversations,
    deleteConversation,
    patchConversation,
    setActiveId,
    startNewConversation,
  } = useConversations();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || null,
    [activeId, conversations]
  );
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    function closeMenu() {
      setContextMenu(null);
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, []);

  function updateAssistant(conversationId, assistantId, patcher) {
    patchConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === assistantId ? { ...message, ...patcher(message) } : message
      ),
    }));
  }

  function handleNewConversation() {
    if (asking) return;
    startNewConversation();
    setQuestion("");
  }

  function handleContextMenu(event, conversationId) {
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 170),
      y: Math.min(event.clientY, window.innerHeight - 96),
      conversationId,
    });
  }

  function handleExportConversation() {
    const conversation = conversations.find((item) => item.id === contextMenu?.conversationId);
    if (conversation) exportConversationAsPdf(conversation);
    setContextMenu(null);
  }

  function handleDeleteConversation() {
    if (contextMenu?.conversationId) deleteConversation(contextMenu.conversationId);
    setContextMenu(null);
  }

  async function ask(text) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    let conversation = activeConversation;
    if (!conversation) {
      conversation = createConversation(trimmed.slice(0, 24));
      startNewConversation(conversation);
    }

    const conversationId = conversation.id;
    const sessionId = conversation.sessionId;
    const assistantId = createId();

    setQuestion("");
    setAsking(true);
    patchConversation(conversationId, (item) => ({
      ...item,
      messages: [
        ...item.messages,
        { id: createId(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", status: "正在分析问题..." },
      ],
    }));

    try {
      const response = await fetch("/api/ask-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, session_id: sessionId }),
      });

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ detail: "请求失败" }));
        throw new Error(error.detail || "请求失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let routeStrategy = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseEventStream(buffer);
        buffer = parsed.rest;

        for (const item of parsed.events) {
          if (item.event === "status") {
            updateAssistant(conversationId, assistantId, () => ({ status: item.data.message }));
          }

          if (item.event === "route") {
            routeStrategy = item.data?.strategy || "";
          }

          if (item.event === "token") {
            updateAssistant(conversationId, assistantId, (message) => ({
              content: `${message.content}${item.data.text}`,
              status: "",
            }));
          }

          if (item.event === "done") {
            updateAssistant(conversationId, assistantId, () => ({
              status: "",
              meta: {
                strategy: routeStrategy,
                elapsed: item.data?.elapsed_seconds ?? null,
                fromCache: Boolean(item.data?.from_cache),
              },
            }));
          }

          if (item.event === "error") {
            throw new Error(item.data.detail || "生成失败");
          }
        }
      }
    } catch (error) {
      updateAssistant(conversationId, assistantId, () => ({
        content: `出错了：${error.message}`,
        status: "",
      }));
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar
        activeConversation={activeConversation}
        asking={asking}
        contextMenu={contextMenu}
        conversations={conversations}
        onContextMenu={handleContextMenu}
        onDeleteConversation={handleDeleteConversation}
        onExportConversation={handleExportConversation}
        onNewConversation={handleNewConversation}
        onSelectConversation={setActiveId}
      />

      <ChatPanel
        asking={asking}
        examples={examples}
        messages={messages}
        onAsk={ask}
        question={question}
        setQuestion={setQuestion}
        showSuggestions={messages.length === 0}
      />
    </main>
  );
}
