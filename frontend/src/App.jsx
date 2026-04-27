import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import Sidebar from "./components/Sidebar";
import { examples } from "./constants/chat";
import { useConversations } from "./hooks/useConversations";
import { createId } from "./utils/conversation";
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
  const messagesRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || conversations[0],
    [activeId, conversations]
  );
  const messages = activeConversation?.messages || [];
  const showSuggestions = !messages.some((message) => message.role === "user");

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
      x: Math.min(event.clientX, window.innerWidth - 160),
      y: Math.min(event.clientY, window.innerHeight - 92),
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
    if (!trimmed || asking || !activeConversation) return;

    const conversationId = activeConversation.id;
    const sessionId = activeConversation.sessionId;
    const assistantId = createId();

    setQuestion("");
    setAsking(true);
    patchConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        { id: createId(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", status: "正在连接后端..." },
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
      let route = "";

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
            route = item.data?.strategy ? `策略：${item.data.strategy}` : "";
          }

          if (item.event === "token") {
            updateAssistant(conversationId, assistantId, (message) => ({
              content: `${message.content}${item.data.text}`,
              status: "",
            }));
          }

          if (item.event === "done") {
            const elapsed = item.data?.elapsed_seconds;
            const cacheLabel = item.data?.from_cache ? "缓存命中" : "";
            updateAssistant(conversationId, assistantId, () => ({
              status: "",
              meta: [route, cacheLabel, elapsed ? `耗时：${elapsed}s` : ""]
                .filter(Boolean)
                .join(" · "),
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
        messagesRef={messagesRef}
        onAsk={ask}
        question={question}
        setQuestion={setQuestion}
        showSuggestions={showSuggestions}
      />
    </main>
  );
}
