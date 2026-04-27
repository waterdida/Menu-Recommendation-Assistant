import { STORAGE_KEY, welcomeMessage } from "../constants/chat";

export function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function createConversation() {
  const now = Date.now();
  return {
    id: createId(),
    sessionId: createId(),
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    messages: [{ id: createId(), ...welcomeMessage }],
  };
}

export function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [createConversation()];
}

export function saveConversations(conversations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function getConversationTitle(messages) {
  const firstQuestion = messages.find((message) => message.role === "user")?.content;
  if (!firstQuestion) return "新对话";
  return firstQuestion.length > 18 ? `${firstQuestion.slice(0, 18)}...` : firstQuestion;
}
