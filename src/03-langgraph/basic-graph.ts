/**
 * 03 — Your first LangGraph: a StateGraph with two nodes wired in a line.
 *
 * The mental model shift from section 01/02: instead of one linear
 * .pipe() chain, you define:
 *   1. STATE  — the shared data structure every node reads/writes
 *   2. NODES  — plain functions: (state) => partial state update
 *   3. EDGES  — how control flows between nodes (fixed or conditional)
 * LangGraph then compiles that into a runnable graph, and can persist,
 * inspect, replay, or interrupt it at any node boundary — none of which
 * a plain LCEL chain gives you for free.
 *
 * Run: pnpm 03:basic
 */
import "dotenv/config";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

// The Annotation API defines your graph's shared state and, importantly,
// HOW each field merges when multiple nodes touch it. `messages` uses the
// built-in append-only reducer further down in agent-with-tools.ts; here
// we keep it simple with plain "last write wins" fields.
const GraphState = Annotation.Root({
  topic: Annotation<string>(),
  draft: Annotation<string>(),
  wordCount: Annotation<number>(),
});

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });

// A node is just: (state) => Partial<state>. LangGraph merges whatever
// you return into the running state before calling the next node.
async function writeDraft(state: typeof GraphState.State) {
  const response = await model.invoke([
    new HumanMessage(`Write a 2-sentence intro paragraph about: ${state.topic}`),
  ]);
  const draft = response.content as string;
  return { draft };
}

async function countWords(state: typeof GraphState.State) {
  // Nodes don't need to touch the LLM at all — plain deterministic logic
  // is just as valid a node as a model call.
  const wordCount = state.draft.trim().split(/\s+/).length;
  return { wordCount };
}

// Build the graph: register nodes, then wire edges between them.
const graph = new StateGraph(GraphState)
  .addNode("writeDraft", writeDraft)
  .addNode("countWords", countWords)
  .addEdge(START, "writeDraft") // START/END are LangGraph's fixed entry/exit points
  .addEdge("writeDraft", "countWords")
  .addEdge("countWords", END)
  .compile();

async function main() {
  const result = await graph.invoke({ topic: "why sourdough starters need feeding" });
  console.log("--- Final state after the graph runs ---");
  console.log(result);
}

main();
