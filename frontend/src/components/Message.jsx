import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { strategyLabels } from "../constants/chat";

function Message({ message }) {
  const isUser = message.role === "user";
  const isStreaming = !isUser && !message.status && !message.meta && Boolean(message.content);

  return (
    <article className={`message ${message.role}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? "你" : "🍜"}
      </div>
      <div className="bubble-wrap">
        <div className="bubble">
          {isUser ? (
            message.content
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {`${message.content || " "}${isStreaming ? "▌" : ""}`}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {message.status ? (
          <div className="status">
            <span className="status-spinner" aria-hidden="true" />
            {message.status}
          </div>
        ) : null}

        {message.meta ? (
          <div className="meta">
            {message.meta.strategy ? (
              <span className="meta-tag strategy">
                ⚡ {strategyLabels[message.meta.strategy] || message.meta.strategy}
              </span>
            ) : null}
            {message.meta.elapsed ? <span className="meta-tag time">⏱ {message.meta.elapsed}s</span> : null}
            {message.meta.fromCache ? <span className="meta-tag">缓存命中</span> : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default memo(Message);
