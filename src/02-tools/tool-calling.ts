/**
 * 02 — Tool calling: letting the model decide WHEN and WITH WHAT
 * ARGUMENTS to call a tool. The model never executes code itself — it
 * only ever emits a structured "please call this function with these
 * args" instruction, and your code is responsible for actually running it
 * and feeding the result back in. This request/response loop is the
 * entire foundation of every "agent" you'll build in section 03.
 *
 * Run: pnpm 02:toolcall
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { getWeather } from "./custom-tool.js";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// bindTools tells the model "these functions exist, call one if it helps
// answer the user". The model itself is unchanged — this just attaches
// tool schemas to the request.
const modelWithTools = model.bindTools([getWeather]);

async function main() {
  const messages = [new HumanMessage("Should I bring a jacket if I'm heading to London?")];

  const aiMessage = await modelWithTools.invoke(messages);
  messages.push(aiMessage);

  console.log("--- Did the model ask to call a tool? ---");
  console.log(aiMessage.tool_calls);
  // e.g. [{ name: 'get_weather', args: { city: 'London' }, id: '...' }]

  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    // The model asked for a tool call — WE run it (never the model), then
    // report the result back as a ToolMessage tagged with the same call id
    // so the model can match request -> result when we ask it to continue.
    for (const call of aiMessage.tool_calls) {
      const output = await getWeather.invoke(call.args as { city: string });
      messages.push(new ToolMessage({ content: output, tool_call_id: call.id! }));
    }

    // Second round trip: now the model has the tool's real output and can
    // turn it into a natural-language answer.
    const finalResponse = await modelWithTools.invoke(messages);
    console.log("\n--- Final answer after tool result was fed back ---");
    console.log(finalResponse.content);
  } else {
    console.log("\nModel answered directly without needing a tool.");
    console.log(aiMessage.content);
  }
}

main();
