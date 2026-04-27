import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../constants/chat";

export function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function createConversation(title = "新对话") {
  const now = Date.now();
  return {
    id: createId(),
    sessionId: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function normalizeConversation(conversation) {
  return {
    id: conversation.id || createId(),
    sessionId: conversation.sessionId || conversation.id || createId(),
    title: conversation.title || getConversationTitle(conversation.messages || []),
    createdAt: conversation.createdAt || Date.now(),
    updatedAt: conversation.updatedAt || conversation.createdAt || Date.now(),
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
  };
}

export function loadConversations() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(saved) && saved.length) return saved.map(normalizeConversation);
    } catch {
      localStorage.removeItem(key);
    }
  }
  return [];
}

export function saveConversations(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function getConversationTitle(messages) {
  const firstQuestion = messages.find((message) => message.role === "user")?.content?.trim();
  if (!firstQuestion) return "新对话";
  return firstQuestion.length > 24 ? `${firstQuestion.slice(0, 24)}...` : firstQuestion;
}
