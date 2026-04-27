import { memo } from "react";
import Message from "./Message";
import { useVirtualList } from "../hooks/useVirtualList";

function ChatPanel({
  asking,
  examples,
  messages,
  messagesRef,
  onAsk,
  question,
  setQuestion,
  showSuggestions,
}) {
  const virtualMessages = useVirtualList({
    items: messages,
    scrollRef: messagesRef,
    estimateSize: 132,
    overscan: 8,
  });

  return (
    <section className="chat-panel" aria-label="聊天">
      <div ref={messagesRef} className="messages">
        <div style={{ height: virtualMessages.beforeHeight }} aria-hidden="true" />
        {virtualMessages.items.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div style={{ height: virtualMessages.afterHeight }} aria-hidden="true" />
      </div>

      <div className="composer-area">
        {showSuggestions ? (
          <div className="suggestions" aria-label="建议问题">
            {examples.map((item) => (
              <button key={item} type="button" onClick={() => setQuestion(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            onAsk(question);
          }}
        >
          <textarea
            value={question}
            rows={2}
            placeholder="输入你的问题，例如：家里有土豆和牛肉，推荐几道菜"
            disabled={asking}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAsk(question);
              }
            }}
          />
          <button type="submit" disabled={asking}>
            {asking ? "生成中" : "发送"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default memo(ChatPanel);
