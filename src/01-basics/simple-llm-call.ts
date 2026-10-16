/**
 * 01 — The absolute simplest thing LangChain does for you:
 * a typed, provider-agnostic wrapper around a chat model.
 *
 * Run: pnpm 01:llm
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// ChatOpenAI (and every other @langchain/* chat model) implements the same
// BaseChatModel interface. That's the entire value proposition at this
// level: swap ChatOpenAI for ChatAnthropic or ChatOllama later and every
// other file in this repo keeps working unchanged.
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
});

async function main() {
  // LangChain represents a conversation as an array of typed Message
  // objects rather than raw strings. This is what makes multi-turn state,
  // system prompts, and tool-call history composable later on.
  const response = await model.invoke([
    new SystemMessage("You are a terse, no-fluff coding mentor."),
    new HumanMessage("In one sentence, what problem does LangGraph solve that plain LangChain chains don't?"),
  ]);

  console.log("--- Model response ---");
  console.log(response.content);

  // Every response is an AIMessage — it also carries metadata you'll
  // use constantly once you start debugging cost/latency:
  console.log("\n--- Usage metadata ---");
  console.log(response.usage_metadata);
}

main();
