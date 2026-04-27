import { memo } from "react";
import ContextMenu from "./ContextMenu";

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

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
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo-icon">🍜</div>
          <span className="sidebar-title">菜单推荐助手</span>
        </div>
        <p className="sidebar-subtitle">Graph RAG · 菜谱知识库</p>
        <button className="new-chat-btn" type="button" onClick={onNewConversation} disabled={asking}>
          <PlusIcon />
          新对话
        </button>
      </div>

      <div className="sidebar-body">
        {conversations.length === 0 ? (
          <p className="no-sessions">还没有对话记录</p>
        ) : (
          <div className="session-list">
            {conversations.map((conversation) => (
              <button
                className={`session-item${conversation.id === activeConversation?.id ? " active" : ""}`}
                key={conversation.id}
                type="button"
                onContextMenu={(event) => onContextMenu(event, conversation.id)}
                onClick={() => {
                  if (!asking) onSelectConversation(conversation.id);
                }}
                disabled={asking && conversation.id !== activeConversation?.id}
              >
                <ChatIcon />
                <span className="session-title">{conversation.title || "新对话"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="rag-badge">
          <div className="rag-badge-dot" />
          Graph RAG 已连接
        </div>
      </div>

      <ContextMenu menu={contextMenu} onDelete={onDeleteConversation} onExport={onExportConversation} />
    </aside>
  );
}

export default memo(Sidebar);
