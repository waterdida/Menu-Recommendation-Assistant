import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Message({ message }) {
  const label = message.role === "user" ? "你" : "AI";

  return (
    <article className={`message ${message.role}`}>
      <div className="avatar" aria-hidden="true">
        {label}
      </div>
      <div className="bubble">
        {message.role === "assistant" ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || " "}</ReactMarkdown>
          </div>
        ) : (
          message.content
        )}
        {message.status ? <div className="status">{message.status}</div> : null}
        {message.meta ? <div className="meta">{message.meta}</div> : null}
      </div>
    </article>
  );
}

export default memo(Message);
