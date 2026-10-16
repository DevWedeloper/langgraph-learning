/**
 * 04 — Checkpointers: LangGraph's answer to "how does an agent remember
 * previous turns/sessions?" A checkpointer snapshots the graph's state
 * after every step, keyed by a `thread_id`. Re-invoking the graph with
 * the same thread_id resumes exactly where it left off — no manual
 * message-history plumbing required.
 *
 * This is also the same mechanism behind human-in-the-loop interrupts and
 * time-travel/debugging in LangGraph — all built on "state is snapshotted
 * and addressable by thread_id".
 *
 * Run: pnpm 04:memory
 */
import "dotenv/config";
import { StateGraph, START, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

// MemorySaver is an in-process, in-memory checkpointer — perfect for
// learning/dev. Swap it for a Postgres/SQLite/Redis checkpointer in
// production so memory survives process restarts.
const checkpointer = new MemorySaver();

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .compile({ checkpointer });

async function main() {
  // `thread_id` is the whole trick: every .invoke() with this config
  // reads/writes the SAME persisted state. Different thread_id = a
  // completely separate, isolated conversation.
  const threadA = { configurable: { thread_id: "user-123" } };

  await graph.invoke(
    { messages: [{ role: "user", content: "My name is Kai. Remember that." }] },
    threadA,
  );

  // No need to resend prior messages — the checkpointer already has them
  // attached to thread_id "user-123".
  const followUp = await graph.invoke(
    { messages: [{ role: "user", content: "What's my name?" }] },
    threadA,
  );

  console.log("--- Thread A (should remember 'Kai') ---");
  console.log(followUp.messages[followUp.messages.length - 1].content);

  // A different thread_id has no knowledge of thread A whatsoever.
  const threadB = { configurable: { thread_id: "user-456" } };
  const isolated = await graph.invoke(
    { messages: [{ role: "user", content: "What's my name?" }] },
    threadB,
  );

  console.log("\n--- Thread B (fresh thread, no memory of Kai) ---");
  console.log(isolated.messages[isolated.messages.length - 1].content);
}

main();
