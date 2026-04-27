import { memo } from "react";

function ContextMenu({ menu, onDelete, onExport }) {
  if (!menu) return null;

  return (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" role="menuitem" onClick={onExport}>
        导出为 PDF
      </button>
      <button className="danger" type="button" role="menuitem" onClick={onDelete}>
        删除会话
      </button>
    </div>
  );
}

export default memo(ContextMenu);
