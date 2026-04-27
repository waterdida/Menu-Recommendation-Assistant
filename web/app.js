const { useEffect, useRef, useState } = React;

const examples = [
  "我今晚想吃清淡一点，有什么蔬菜菜谱推荐？",
  "家里有鸡蛋和西红柿，可以做什么？",
  "麻婆豆腐怎么做？",
  "有没有适合早餐的快手菜？",
];

function parseEventStream(buffer) {
  const events = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() || "";

  for (const block of blocks) {
    let event = "message";
    let data = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      }
      if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (data) {
      events.push({ event, data: JSON.parse(data) });
    }
  }

  return { events, rest };
}

function Message({ message }) {
  return React.createElement(
    "article",
    { className: `message ${message.role}` },
    React.createElement(
      "div",
      { className: "bubble" },
      message.content || (message.role === "assistant" ? " " : ""),
      message.status ? React.createElement("div", { className: "status" }, message.status) : null,
      message.meta ? React.createElement("div", { className: "meta" }, message.meta) : null
    )
  );
}

function App() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "你好，我可以根据菜谱知识库推荐菜、解释做法，或者按食材帮你搭配菜单。",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function updateAssistant(id, patcher) {
    setMessages((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patcher(item) } : item))
    );
  }

  async function ask(text) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    const assistantId = crypto.randomUUID();
    setQuestion("");
    setAsking(true);
    setMessages((items) => [
      ...items,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "", status: "正在连接后端..." },
    ]);

    try {
      const response = await fetch("/api/ask-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
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
            updateAssistant(assistantId, () => ({ status: item.data.message }));
          }

          if (item.event === "route") {
            route = item.data?.strategy ? `策略：${item.data.strategy}` : "";
          }

          if (item.event === "token") {
            updateAssistant(assistantId, (message) => ({
              content: `${message.content}${item.data.text}`,
              status: "",
            }));
          }

          if (item.event === "done") {
            const elapsed = item.data?.elapsed_seconds;
            updateAssistant(assistantId, () => ({
              status: "",
              meta: [route, elapsed ? `耗时：${elapsed}s` : ""].filter(Boolean).join(" · "),
            }));
          }

          if (item.event === "error") {
            throw new Error(item.data.detail || "生成失败");
          }
        }
      }
    } catch (error) {
      updateAssistant(assistantId, () => ({
        content: `出错了：${error.message}`,
        status: "",
      }));
    } finally {
      setAsking(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    ask(question);
  }

  return React.createElement(
    "main",
    { className: "app-shell" },
    React.createElement(
      "aside",
      { className: "sidebar", "aria-label": "示例问题" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "eyebrow" }, "RAG 菜谱问答"),
        React.createElement("h1", null, "菜单推荐助手")
      ),
      React.createElement(
        "div",
        { className: "examples" },
        examples.map((item) =>
          React.createElement(
            "button",
            { key: item, type: "button", onClick: () => setQuestion(item) },
            item
          )
        )
      )
    ),
    React.createElement(
      "section",
      { className: "chat-panel", "aria-label": "聊天" },
      React.createElement(
        "div",
        { ref: messagesRef, className: "messages" },
        messages.map((message) => React.createElement(Message, { key: message.id, message }))
      ),
      React.createElement(
        "form",
        { className: "composer", onSubmit: handleSubmit },
        React.createElement("textarea", {
          value: question,
          rows: 2,
          placeholder: "输入你的问题，例如：家里有土豆和牛肉，推荐几道菜",
          disabled: asking,
          onChange: (event) => setQuestion(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask(question);
            }
          },
        }),
        React.createElement("button", { type: "submit", disabled: asking }, asking ? "生成中" : "发送")
      )
    )
  );
}

ReactDOM.createRoot(document.querySelector("#root")).render(React.createElement(App));
