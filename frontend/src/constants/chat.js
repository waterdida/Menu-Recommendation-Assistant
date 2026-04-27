export const STORAGE_KEY = "menu-rag-conversations-v1";

export const examples = [
  "鸡肉可以搭配什么蔬菜？",
  "推荐几道低糖川菜，并且制作时间不超过30分钟",
  "家里有鸡蛋和西红柿，可以做什么？",
  "麻婆豆腐怎么做？",
];

export const welcomeMessage = {
  role: "assistant",
  content: "你好，我可以根据菜谱知识库推荐菜、解释做法，或者按食材帮你搭配菜单。",
};
