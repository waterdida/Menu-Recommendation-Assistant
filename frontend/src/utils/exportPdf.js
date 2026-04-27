function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMeta(meta) {
  if (!meta) return "";
  if (typeof meta === "string") return escapeHtml(meta);

  return [
    meta.strategy ? `策略：${meta.strategy}` : "",
    meta.elapsed ? `耗时：${meta.elapsed}s` : "",
    meta.fromCache ? "缓存命中" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function exportConversationAsPdf(conversation) {
  const printableMessages = conversation.messages
    .filter((message) => message.content?.trim())
    .map((message) => {
      const role = message.role === "user" ? "用户" : "助手";
      const meta = renderMeta(message.meta);
      return `
        <section class="print-message ${message.role}">
          <div class="role">${role}</div>
          <div class="content">${escapeHtml(message.content)}</div>
          ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
        </section>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=900,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(conversation.title)} - 对话记录</title>
        <style>
          body {
            margin: 0;
            padding: 32px;
            color: #222;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            line-height: 1.7;
          }
          h1 {
            margin: 0 0 24px;
            font-size: 22px;
          }
          .print-message {
            break-inside: avoid;
            margin: 0 0 18px;
            border-radius: 8px;
            padding: 14px 16px;
          }
          .print-message.user {
            background: #e8edf8;
          }
          .print-message.assistant {
            background: #f5f5f5;
          }
          .role {
            margin-bottom: 8px;
            color: #666;
            font-size: 13px;
            font-weight: 700;
          }
          .content {
            white-space: pre-wrap;
          }
          .meta {
            margin-top: 10px;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 18mm; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(conversation.title || "对话记录")}</h1>
        ${printableMessages}
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
