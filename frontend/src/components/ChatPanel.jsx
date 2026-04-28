import { memo, useEffect, useRef } from "react";
import { List, useDynamicRowHeight, useListRef } from "react-window";
import Message from "./Message";

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MessageRow({ index, messages, style }) {
  const message = messages[index];

  return (
    <div className={`message-row ${message.role}`} style={style}>
      <Message message={message} />
    </div>
  );
}

function ChatPanel({ asking, examples, messages, onAsk, question, setQuestion, showSuggestions }) {
  const listRef = useListRef();
  const textareaRef = useRef(null);
  const atBottomRef = useRef(true);
  const forceStickToBottomRef = useRef(false);
  const rowHeightKey = messages[0]?.id || "empty";
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 140,
    key: rowHeightKey,
  });

  useEffect(() => {
    if (!messages.length || (!atBottomRef.current && !forceStickToBottomRef.current)) return;

    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    const scroll = () => {
      listRef.current?.scrollToRow({
        align: "end",
        behavior: "instant",
        index: messages.length - 1,
      });
    };

    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(() => {
        scroll();
        forceStickToBottomRef.current = false;
      });
    });
  }

  function handleScroll(event) {
    const element = event.currentTarget;
    atBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
  }

  function handleInput(event) {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    setQuestion(textarea.value);
  }

  function submitQuestion(event) {
    event.preventDefault();
    forceStickToBottomRef.current = true;
    atBottomRef.current = true;
    onAsk(question);
  }

  return (
    <section className="chat-panel" aria-label="聊天">
      <div className="messages-container">
        {messages.length > 0 ? (
          <List
            className="messages-list"
            listRef={listRef}
            onScroll={handleScroll}
            overscanCount={6}
            rowComponent={MessageRow}
            rowCount={messages.length}
            rowHeight={rowHeight}
            rowProps={{ messages }}
            style={{ height: "100%" }}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <div className="empty-title">今天想吃什么？</div>
            <div className="empty-desc">我可以根据食材推荐菜谱、解释做法，或者帮你搭配一份菜单。</div>
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {showSuggestions ? (
          <div className="suggestions" aria-label="建议问题">
            {examples.map((item) => (
              <button
                key={item}
                className="suggestion-chip"
                type="button"
                onClick={() => {
                  setQuestion(item);
                  textareaRef.current?.focus();
                }}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="composer"
          onSubmit={submitQuestion}
        >
          <textarea
            ref={textareaRef}
            value={question}
            rows={1}
            placeholder="输入问题，例如：家里有土豆和牛肉，推荐几道菜"
            disabled={asking}
            onChange={handleInput}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                forceStickToBottomRef.current = true;
                atBottomRef.current = true;
                onAsk(question);
              }
            }}
          />
          <button className="send-btn" type="submit" title={asking ? "生成中" : "发送"} disabled={asking}>
            <SendIcon />
          </button>
        </form>
        <p className="composer-hint">Enter 发送 · Shift+Enter 换行</p>
      </div>
    </section>
  );
}

export default memo(ChatPanel);
