const { useEffect, useRef, useState } = React;

const EXAMPLES = [
  "我今晚想吃清淡一点，有什么蔬菜菜谱推荐？",
  "家里有鸡蛋和西红柿，可以做什么？",
  "麻婆豆腐怎么做？",
  "有没有适合早餐的快手菜？",
  "推荐几道适合减脂的高蛋白菜",
  "川菜有哪些经典菜品？",
];

const STRATEGY_LABELS = {
  hybrid_traditional: "混合检索",
  graph_rag: "图谱检索",
  combined: "组合检索",
};

// ── localStorage helpers ──
function loadSessions() {
  try { return JSON.parse(localStorage.getItem("rag_sessions") || "[]"); } catch { return []; }
}
function saveSessions(sessions) {
  localStorage.setItem("rag_sessions", JSON.stringify(sessions));
}

function parseEventStream(buffer) {
  const events = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() || "";
  for (const block of blocks) {
    let event = "message", data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (data) { try { events.push({ event, data: JSON.parse(data) }); } catch {} }
  }
  return { events, rest };
}

// ── PDF export ──
function exportSessionPDF(session) {
  const win = window.open("", "_blank");
  if (!win) return;
  const title = session.title || "对话记录";
  const rows = session.messages.map(m => {
    const role = m.role === "user" ? "你" : "助手";
    const content = m.role === "user"
      ? (m.content || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
      : marked.parse(m.content || "");
    return `<div class="msg ${m.role}"><strong>${role}</strong><div class="content">${content}</div></div>`;
  }).join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;color:#222;line-height:1.7}
h1{font-size:20px;margin-bottom:24px}.msg{margin-bottom:20px;padding:12px 16px;border-radius:8px}
.msg.user{background:#e8edf8}.msg.assistant{background:#f5f5f5}
strong{display:block;margin-bottom:6px;font-size:13px;color:#666}
.content{margin:0}.content p{margin:0 0 8px}.content p:last-child{margin:0}
.content ul,.content ol{padding-left:20px;margin:4px 0 8px}
.content code{background:#e8e8e8;padding:1px 4px;border-radius:3px;font-size:0.88em}
.content pre{background:#e8e8e8;padding:10px;border-radius:6px;overflow-x:auto}
</style></head><body><h1>${title}</h1>${rows}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

// ── Icons ──
const PlusIcon = () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" },
  React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
  React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
);
const SendIcon = () => React.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
  React.createElement("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
);
const ChatIcon = () => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
  React.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
);

// ── Context menu ──
function ContextMenu({ x, y, onExport, onDelete, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return React.createElement(
    "div",
    { ref, className: "ctx-menu", style: { top: y, left: x } },
    React.createElement("button", { className: "ctx-item", onClick: onExport }, "📄 导出 PDF"),
    React.createElement("div", { className: "ctx-divider" }),
    React.createElement("button", { className: "ctx-item danger", onClick: onDelete }, "🗑 删除会话")
  );
}

// ── Markdown renderer ──
marked.setOptions({ breaks: true, gfm: true });
function renderMarkdown(text) {
  return { __html: marked.parse(text || "") };
}

// ── Message ──
function Message({ message }) {
  const isUser = message.role === "user";
  const isStreaming = !message.status && !isUser && !message.meta && !!message.content;

  const bubbleContent = isUser
    ? React.createElement("div", { className: "bubble" }, message.content)
    : React.createElement("div", {
        className: "bubble",
        dangerouslySetInnerHTML: renderMarkdown(
          message.content + (isStreaming ? "▌" : "")
        ),
      });
  return React.createElement(
    "div", { className: `message ${message.role}` },
    React.createElement("div", { className: "avatar" }, isUser ? "你" : "🍜"),
    React.createElement("div", { className: "bubble-wrap" },
      bubbleContent,
      message.status ? React.createElement("div", { className: "status" },
        React.createElement("div", { className: "status-spinner" }), message.status
      ) : null,
      message.meta ? React.createElement("div", { className: "meta" },
        message.meta.strategy ? React.createElement("span", { className: "meta-tag strategy" },
          "⚡ ", STRATEGY_LABELS[message.meta.strategy] || message.meta.strategy) : null,
        message.meta.elapsed ? React.createElement("span", { className: "meta-tag time" },
          "⏱ ", message.meta.elapsed, "s") : null
      ) : null
    )
  );
}

// ── App ──
function App() {
  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeId, setActiveId] = useState(() => {
    const s = loadSessions();
    return s.length > 0 ? s[0].id : null;
  });
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, sessionId }
  const messagesRef = useRef(null);
  const atBottomRef = useRef(true);
  const textareaRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeId) || null;
  const messages = activeSession ? activeSession.messages : [];
  const hasMessages = messages.length > 0;

  // persist on change
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = messagesRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  function newSession() {
    const id = crypto.randomUUID();
    const session = { id, title: "新对话", createdAt: Date.now(), messages: [] };
    setSessions(prev => [session, ...prev]);
    setActiveId(id);
    setQuestion("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function deleteSession(id) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id) setActiveId(next.length > 0 ? next[0].id : null);
      return next;
    });
    setCtxMenu(null);
  }

  async function ask(text) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    let sessionId = activeId;
    if (!sessionId) {
      const id = crypto.randomUUID();
      const session = { id, title: trimmed.slice(0, 20), createdAt: Date.now(), messages: [] };
      setSessions(prev => [session, ...prev]);
      setActiveId(id);
      sessionId = id;
    }

    const assistantId = crypto.randomUUID();
    const userMsg = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const asstMsg = { id: assistantId, role: "assistant", content: "", status: "正在分析问题..." };

    setQuestion("");
    setAsking(true);
    atBottomRef.current = true;

    // set title from first message
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const isFirst = s.messages.length === 0;
      return {
        ...s,
        title: isFirst ? trimmed.slice(0, 24) : s.title,
        messages: [...s.messages, userMsg, asstMsg],
      };
    }));

    const patch = (id, fn) => setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, messages: s.messages.map(m => m.id === id ? { ...m, ...fn(m) } : m) };
    }));

    try {
      const response = await fetch("/api/ask-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ detail: "请求失败" }));
        throw new Error(err.detail || "请求失败");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "", routeStrategy = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseEventStream(buffer);
        buffer = parsed.rest;
        for (const item of parsed.events) {
          if (item.event === "status") patch(assistantId, () => ({ status: item.data.message }));
          if (item.event === "route") routeStrategy = item.data?.strategy || "";
          if (item.event === "token") patch(assistantId, m => ({ content: m.content + item.data.text, status: "" }));
          if (item.event === "done") patch(assistantId, () => ({ status: "", meta: { strategy: routeStrategy, elapsed: item.data?.elapsed_seconds ?? null } }));
          if (item.event === "error") throw new Error(item.data.detail || "生成失败");
        }
      }
    } catch (error) {
      patch(assistantId, () => ({ content: `出错了：${error.message}`, status: "" }));
    } finally {
      setAsking(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); }
  }

  function handleInput(e) {
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    setQuestion(ta.value);
  }

  function handleSessionCtx(e, sessionId) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, sessionId });
  }

  return React.createElement("main", { className: "app-shell" },

    // ── Sidebar ──
    React.createElement("aside", { className: "sidebar" },
      React.createElement("div", { className: "sidebar-header" },
        React.createElement("div", { className: "logo-row" },
          React.createElement("div", { className: "logo-icon" }, "🍜"),
          React.createElement("span", { className: "sidebar-title" }, "菜单推荐助手")
        ),
        React.createElement("p", { className: "sidebar-subtitle" }, "Graph RAG · 菜谱知识库"),
        React.createElement("button", { className: "new-chat-btn", onClick: newSession },
          React.createElement(PlusIcon), "新对话"
        )
      ),

      React.createElement("div", { className: "sidebar-body" },
        sessions.length === 0
          ? React.createElement("p", { className: "no-sessions" }, "还没有对话记录")
          : React.createElement("div", { className: "session-list" },
              sessions.map(s =>
                React.createElement("button", {
                  key: s.id,
                  className: `session-item${s.id === activeId ? " active" : ""}`,
                  onClick: () => setActiveId(s.id),
                  onContextMenu: e => handleSessionCtx(e, s.id),
                },
                  React.createElement(ChatIcon),
                  React.createElement("span", { className: "session-title" }, s.title || "新对话")
                )
              )
            )
      ),

      React.createElement("div", { className: "sidebar-footer" },
        React.createElement("div", { className: "rag-badge" },
          React.createElement("div", { className: "rag-badge-dot" }),
          "Graph RAG 已就绪"
        )
      )
    ),

    // ── Chat panel ──
    React.createElement("section", { className: "chat-panel" },
      React.createElement("div", { ref: messagesRef, className: "messages", onScroll: handleScroll },
        hasMessages
          ? messages.map(msg => React.createElement(Message, { key: msg.id, message: msg }))
          : React.createElement("div", { className: "empty-state" },
              React.createElement("div", { className: "empty-icon" }, "🍽️"),
              React.createElement("div", { className: "empty-title" }, "今天想吃什么？"),
              React.createElement("div", { className: "empty-desc" }, "我可以根据食材推荐菜谱、解释做法，或者帮你搭配一份菜单。")
            )
      ),

      React.createElement("div", { className: "composer-wrap" },
        // ── 示例推荐（仅首次对话前显示）──
        !hasMessages && React.createElement("div", { className: "suggestions" },
          EXAMPLES.map(ex =>
            React.createElement("button", {
              key: ex, className: "suggestion-chip",
              onClick: () => { setQuestion(ex); textareaRef.current?.focus(); }
            }, ex)
          )
        ),

        React.createElement("form", {
          className: "composer",
          onSubmit: e => { e.preventDefault(); ask(question); }
        },
          React.createElement("textarea", {
            ref: textareaRef,
            value: question,
            rows: 1,
            placeholder: "输入问题，例如：家里有土豆和牛肉，推荐几道菜",
            disabled: asking,
            onChange: handleInput,
            onKeyDown: handleKeyDown,
          }),
          React.createElement("button", { type: "submit", className: "send-btn", title: asking ? "生成中" : "发送" },
            React.createElement(SendIcon)
          )
        ),
        React.createElement("p", { className: "composer-hint" }, "Enter 发送 · Shift+Enter 换行")
      )
    ),

    // ── Context menu ──
    ctxMenu && React.createElement(ContextMenu, {
      x: ctxMenu.x, y: ctxMenu.y,
      onExport: () => {
        const s = sessions.find(s => s.id === ctxMenu.sessionId);
        if (s) exportSessionPDF(s);
        setCtxMenu(null);
      },
      onDelete: () => deleteSession(ctxMenu.sessionId),
      onClose: () => setCtxMenu(null),
    })
  );
}

ReactDOM.createRoot(document.querySelector("#root")).render(React.createElement(App));
