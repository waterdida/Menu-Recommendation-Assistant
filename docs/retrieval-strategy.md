# Retrieval Strategy

The system supports three retrieval modes.

## hybrid_traditional

Use this mode for direct recipe questions, such as:

- How do I cook a specific dish?
- What ingredients does a dish need?
- What are the steps for a dish?

The implementation combines dual-level graph keyword retrieval with vector search.

## graph_rag

Use this mode for relationship-heavy questions, such as:

- Why do two ingredients pair well?
- What vegetables pair with chicken?
- What dishes are similar to another dish?

The implementation uses graph traversal and subgraph extraction from Neo4j.

## combined

Use this mode for recommendation questions with constraints, such as:

- Recommend low-sugar Sichuan dishes under 30 minutes.
- Find quick vegetarian home-style dishes.
- Recommend low-oil dishes for weight loss.

The implementation merges graph results and traditional hybrid retrieval results.

## Routing

`rag_modules/intelligent_query_router.py` first asks the LLM to analyze the query. If that fails or the query clearly needs graph reasoning, rule-based guardrails keep graph-heavy questions from falling back to traditional retrieval too aggressively.
