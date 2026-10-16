/**
 * 03 — The ReAct agent loop, built by hand: model -> tool -> model -> ...
 * until the model stops asking for tools. This is the pattern behind
 * basically every "AI agent" you've heard of, and LangGraph is built
 * specifically to express loops like this cleanly (a plain LCEL chain
 * can't loop back on itself the way a graph can).
 *
 * We build it manually here (rather than using LangGraph's prebuilt
 * createReactAgent) so the loop mechanics aren't hidden from you. Once
 * this makes sense, swapping in the prebuilt helper is a one-line change
 * — see the comment at the bottom.
 *
 * Run: pnpm 03:agent
 */
import "dotenv/config";
import { StateGraph, START, END, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { AIMessage } from "@langchain/core/messages";

// --- Tools ---------------------------------------------------------------

const calculator = tool(
  async ({ expression }) => {
    // NEVER use eval() on untrusted input in a real app — this is a
    // learning toy. A real calculator tool would use a safe math parser.
    try {
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return String(result);
    } catch {
      return "Error: could not evaluate that expression.";
    }
  },
  {
    name: "calculator",
    description: "Evaluate a basic arithmetic expression, e.g. '12 * (4 + 1)'.",
    schema: z.object({ expression: z.string() }),
  },
);

const lookupCityFact = tool(
  async ({ city }) => {
    const facts: Record<string, string> = {
      tokyo: "Tokyo has one of the world's busiest pedestrian crossings, Shibuya.",
      manila: "Manila is one of the most densely populated cities in the world.",
    };
    return facts[city.toLowerCase()] ?? `No fact on file for ${city}.`;
  },
  {
    name: "lookup_city_fact",
    description: "Look up one interesting fact about a city.",
    schema: z.object({ city: z.string() }),
  },
);

const tools = [calculator, lookupCityFact];

// MessagesAnnotation is LangGraph's built-in state shape for chat-style
// graphs: a `messages` field whose reducer APPENDS new messages instead
// of overwriting — required for a growing conversation/tool-call history.
const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }).bindTools(tools);

async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] }; // appended, not replacing, thanks to the reducer
}

// ToolNode is a small LangGraph prebuilt: given the latest AIMessage's
// tool_calls, it runs the matching tool(s) and returns ToolMessage(s).
// It's exactly the manual loop you wrote in 02/tool-calling.ts, packaged.
const toolNode = new ToolNode(tools);

// The router: look at the last message. If the model asked for tools, go
// run them; otherwise we're done.
function shouldContinue(state: typeof MessagesAnnotation.State): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END })
  // This is the loop: after running tools, go BACK to the agent so it can
  // read the tool results and either call another tool or answer.
  .addEdge("tools", "agent")
  .compile();

async function main() {
  const result = await graph.invoke({
    messages: [
      {
        role: "user",
        content:
          "What's an interesting fact about Tokyo, and separately, what's 17 * 24?",
      },
    ],
  });

  console.log("--- Full message history (the whole ReAct trace) ---");
  for (const m of result.messages) {
    const toolCalls = "tool_calls" in m ? (m as AIMessage).tool_calls : undefined;
    console.log(`[${m.getType()}]`, m.content || toolCalls);
  }

  console.log("\n--- Final answer only ---");
  console.log(result.messages[result.messages.length - 1].content);
}

main();

/**
 * Shortcut: LangGraph ships this exact pattern as a one-liner:
 *
 *   import { createReactAgent } from "@langchain/langgraph/prebuilt";
 *   const agent = createReactAgent({ llm: model, tools });
 *
 * Worth using in real projects. Worth NOT using on your first pass,
 * because it hides the agent/tools/router graph you just built by hand.
 */
