import { memo } from "react";
import ContextMenu from "./ContextMenu";

function Sidebar({
  activeConversation,
  asking,
  contextMenu,
  conversations,
  onContextMenu,
  onDeleteConversation,
  onExportConversation,
  onNewConversation,
  onSelectConversation,
}) {
  return (
    <aside className="sidebar" aria-label="对话历史">
      <div className="brand">
        <p className="eyebrow">RAG 菜谱问答</p>
        <h1>菜单推荐助手</h1>
      </div>

      <button className="new-chat-button" type="button" onClick={onNewConversation} disabled={asking}>
        新对话
      </button>

      <div className="history" aria-label="历史对话">
        <div className="history-title">历史对话</div>
        <div className="history-list">
          {conversations.map((conversation) => (
            <button
              className={`history-item ${conversation.id === activeConversation?.id ? "active" : ""}`}
              key={conversation.id}
              type="button"
              onContextMenu={(event) => onContextMenu(event, conversation.id)}
              onClick={() => {
                if (!asking) onSelectConversation(conversation.id);
              }}
              disabled={asking && conversation.id !== activeConversation?.id}
            >
              <span>{conversation.title}</span>
              <time>
                {new Date(conversation.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </button>
          ))}
        </div>
      </div>

      <ContextMenu
        menu={contextMenu}
        onDelete={onDeleteConversation}
        onExport={onExportConversation}
      />
    </aside>
  );
}

export default memo(Sidebar);
