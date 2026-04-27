# 前端源码结构

这个前端是一个 Vite + React 的聊天界面。为了方便上线维护，代码按职责拆成几个小目录。

## 目录说明

- `App.jsx`
  - 页面总入口，只负责组合状态、请求后端、分发事件。
- `components/`
  - `Sidebar.jsx`：左侧新对话、历史对话、右键菜单入口。
  - `ChatPanel.jsx`：右侧消息列表、建议卡片、输入框。
  - `Message.jsx`：单条消息气泡和头像。
  - `ContextMenu.jsx`：历史会话右键菜单。
- `hooks/`
  - `useConversations.js`：会话增删改查、本地存储、防抖保存。
  - `useVirtualList.js`：消息虚拟列表，只渲染可视区附近的消息。
- `utils/`
  - `conversation.js`：创建会话、生成标题、读写本地存储。
  - `sse.js`：解析后端 SSE 流式响应。
  - `exportPdf.js`：把会话记录导出到浏览器打印窗口，用“另存为 PDF”保存。
- `constants/`
  - `chat.js`：建议问题、欢迎语、本地存储 key。
- `styles.css`
  - 全局布局和组件样式。

## 请求流程

1. 用户在 `ChatPanel` 输入问题。
2. `App.jsx` 把用户消息追加到当前会话。
3. `App.jsx` 调用 `/api/ask-stream`。
4. `utils/sse.js` 解析流式事件。
5. 后端返回 `token` 时，前端持续更新当前 AI 消息。
6. 后端返回 `done` 时，前端写入策略、耗时、缓存命中等元信息。

## 性能点

- 会话保存做了 250ms 防抖，避免模型流式输出时每个 token 都同步写 `localStorage`。
- 消息列表使用 `useVirtualList`，历史消息很多时只渲染可视区附近的 DOM。
- `Message` 用 `memo` 包裹，减少无关重渲染。
- CSS 使用 `content-visibility` 和 `contain` 降低长页面布局压力。
