export const STORAGE_KEY = "menu-rag-conversations-v2";
export const LEGACY_STORAGE_KEYS = ["rag_sessions", "menu-rag-conversations-v1"];

export const examples = [
  "我今晚想吃清淡一点，有什么蔬菜菜谱推荐？",
  "家里有鸡蛋和西红柿，可以做什么？",
  "麻婆豆腐怎么做？",
  "有没有适合早餐的快手菜？",
  "推荐几道适合减脂的高蛋白菜",
  "川菜有哪些经典菜品？",
];

export const strategyLabels = {
  hybrid_traditional: "混合检索",
  graph_rag: "图谱检索",
  combined: "组合检索",
};
