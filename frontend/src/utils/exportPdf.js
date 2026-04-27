function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function exportConversationAsPdf(conversation) {
  const printableMessages = conversation.messages
    .filter((message) => message.content?.trim())
    .map((message) => {
      const role = message.role === "user" ? "用户" : "AI";
      const meta = message.meta ? `<div class="meta">${escapeHtml(message.meta)}</div>` : "";
      return `
        <section class="print-message ${message.role}">
          <div class="role">${role}</div>
          <div class="content">${escapeHtml(message.content)}</div>
          ${meta}
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
            color: #23201d;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            line-height: 1.7;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }
          .sub {
            margin: 0 0 24px;
            color: #6d665d;
            font-size: 13px;
          }
          .print-message {
            break-inside: avoid;
            margin: 0 0 18px;
            border: 1px solid #e1d7c8;
            border-radius: 8px;
            padding: 14px 16px;
          }
          .print-message.user {
            border-color: #b9d1c7;
            background: #f3faf7;
          }
          .role {
            margin-bottom: 8px;
            color: #315c4d;
            font-weight: 700;
          }
          .content {
            white-space: pre-wrap;
          }
          .meta {
            margin-top: 10px;
            color: #6d665d;
            font-size: 12px;
          }
          @media print {
            body { padding: 18mm; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(conversation.title)}</h1>
        <p class="sub">导出时间：${new Date().toLocaleString()}</p>
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
