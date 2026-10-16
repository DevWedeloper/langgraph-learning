/**
 * 01 — Prompt templates: parameterized, reusable prompts instead of
 * hand-built strings.
 *
 * Run: pnpm 01:prompt
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

// ChatPromptTemplate.fromMessages builds a reusable template with named
// {placeholders}. This is the thing you'll reach for anytime a prompt has
// variables — user input, retrieved context, few-shot examples, etc.
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You explain {topic} to a {audience}. Keep it under 3 sentences."],
  ["human", "{question}"],
]);

async function main() {
  // .format() lets you inspect exactly what will be sent to the model —
  // invaluable for debugging prompts before they ever hit the API.
  const formatted = await prompt.formatMessages({
    topic: "graph databases",
    audience: "5th grader",
    question: "Why would I use a graph instead of a spreadsheet?",
  });
  console.log("--- Rendered prompt ---");
  console.log(formatted);

  // A PromptTemplate is a Runnable, same interface as the model. You can
  // .invoke() it standalone, or (next file) .pipe() it into the model.
  const response = await model.invoke(formatted);
  console.log("\n--- Model response ---");
  console.log(response.content);
}

main();
