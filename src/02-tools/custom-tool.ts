/**
 * 02 — Defining a tool: a typed function the model can choose to call.
 * This file doesn't touch the LLM at all — it's just showing what a tool
 * IS before the next file lets a model actually decide to invoke it.
 *
 * Run: pnpm 02:tool
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// `tool()` wraps a plain async function with a Zod schema (defines the
// arguments the model must supply) and a name/description (defines when
// the model should reach for it). The description is a prompt in itself —
// the model only knows what this tool does from what you write here.
const getWeather = tool(
  async ({ city }) => {
    // Fake implementation — in a real app this would hit a weather API.
    const fakeTemps: Record<string, number> = {
      tokyo: 24,
      manila: 31,
      london: 14,
    };
    const temp = fakeTemps[city.toLowerCase()] ?? 20;
    return `The current temperature in ${city} is ${temp}°C.`;
  },
  {
    name: "get_weather",
    description: "Get the current temperature for a given city.",
    schema: z.object({
      city: z.string().describe("The city to look up, e.g. 'Tokyo'"),
    }),
  },
);

async function main() {
  // A tool is itself a Runnable — you can call it directly like any
  // normal function, no model involved. This is worth doing once so the
  // "tool calling" magic in the next file doesn't feel mysterious: it's
  // just the model producing arguments, and you (or LangGraph) deciding
  // to run `.invoke()` on the matching tool with those arguments.
  const result = await getWeather.invoke({ city: "Manila" });
  console.log("--- Direct tool invocation (no model involved) ---");
  console.log(result);

  console.log("\n--- Tool metadata the model will see ---");
  console.log({ name: getWeather.name, description: getWeather.description });
}

main();

export { getWeather };
