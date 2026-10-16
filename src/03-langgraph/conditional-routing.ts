/**
 * 03 — Conditional edges: the graph decides its OWN next step at runtime
 * based on state, instead of following one fixed path. This is what
 * makes LangGraph a graph rather than just a fancier chain — you can
 * branch, loop, and retry.
 *
 * Scenario: classify a support message, then route it to a different
 * "handler" node depending on the classification.
 *
 * Run: pnpm 03:router
 */
import "dotenv/config";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const GraphState = Annotation.Root({
  message: Annotation<string>(),
  category: Annotation<"billing" | "technical" | "general">(),
  reply: Annotation<string>(),
});

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function classify(state: typeof GraphState.State) {
  const classifier = model.withStructuredOutput(
    z.object({ category: z.enum(["billing", "technical", "general"]) }),
    { name: "classification" },
  );
  const { category } = await classifier.invoke(
    `Classify this support message into billing, technical, or general:\n"${state.message}"`,
  );
  return { category };
}

async function handleBilling(state: typeof GraphState.State) {
  return { reply: `[Billing team] Looking into your billing question: "${state.message}"` };
}

async function handleTechnical(state: typeof GraphState.State) {
  return { reply: `[Technical team] Investigating the issue: "${state.message}"` };
}

async function handleGeneral(state: typeof GraphState.State) {
  return { reply: `[General support] Thanks for reaching out — we'll get back to you shortly.` };
}

// A routing function inspects state and returns the NAME of the next
// node. It runs no LLM call itself here (the classification already
// happened in the `classify` node) — it's pure control flow.
function routeByCategory(state: typeof GraphState.State): "billing" | "technical" | "general" {
  return state.category;
}

const graph = new StateGraph(GraphState)
  .addNode("classify", classify)
  .addNode("billing", handleBilling)
  .addNode("technical", handleTechnical)
  .addNode("general", handleGeneral)
  .addEdge(START, "classify")
  // addConditionalEdges(sourceNode, routerFn, map of returnValue -> targetNode)
  .addConditionalEdges("classify", routeByCategory, {
    billing: "billing",
    technical: "technical",
    general: "general",
  })
  .addEdge("billing", END)
  .addEdge("technical", END)
  .addEdge("general", END)
  .compile();

async function main() {
  for (const message of [
    "I was charged twice for my subscription this month.",
    "The app crashes every time I open the settings page.",
    "What are your support hours?",
  ]) {
    const result = await graph.invoke({ message });
    console.log(`\nInput: ${message}`);
    console.log(`Category: ${result.category}`);
    console.log(`Reply: ${result.reply}`);
  }
}

main();
