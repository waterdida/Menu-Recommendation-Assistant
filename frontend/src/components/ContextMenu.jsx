import { memo } from "react";

function ContextMenu({ menu, onDelete, onExport }) {
  if (!menu) return null;

  return (
    <div
      className="ctx-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onClick={(event) => event.stopPropagation()}
    >
      <button className="ctx-item" type="button" role="menuitem" onClick={onExport}>
        📄 导出 PDF
      </button>
      <div className="ctx-divider" />
      <button className="ctx-item danger" type="button" role="menuitem" onClick={onDelete}>
        🗑 删除会话
      </button>
    </div>
  );
}

export default memo(ContextMenu);
