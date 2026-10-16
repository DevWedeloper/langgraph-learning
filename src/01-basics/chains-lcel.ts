/**
 * 01 — LCEL (LangChain Expression Language): the `.pipe()` syntax for
 * composing Runnables into a chain, plus structured (typed) output.
 *
 * Run: pnpm 01:chain
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

async function basicChain() {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Reply in exactly one short paragraph."],
    ["human", "{input}"],
  ]);

  // Everything in LangChain — prompts, models, parsers, retrievers — is a
  // "Runnable" with the same .invoke/.stream/.batch interface. .pipe()
  // wires their outputs to the next one's input, like a Unix pipe.
  // prompt -> model -> parser
  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const result = await chain.invoke({ input: "Why do people love Unix pipes?" });
  console.log("--- Plain string output (StringOutputParser) ---");
  console.log(result);
  console.log("typeof result:", typeof result); // "string", not an AIMessage
}

async function structuredChain() {
  // Real applications rarely want raw text back — they want typed data
  // they can put straight into a database or UI. `withStructuredOutput`
  // gives the model a JSON schema (built here from a Zod schema) and
  // parses + validates the response for you.
  const recipeSchema = z.object({
    name: z.string().describe("Name of the dish"),
    minutes: z.number().describe("Total time to cook, in minutes"),
    ingredients: z.array(z.string()).describe("Ingredient list"),
  });

  const structuredModel = model.withStructuredOutput(recipeSchema, {
    name: "recipe",
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["human", "Give me a simple recipe idea using {ingredient}."],
  ]);

  const chain = prompt.pipe(structuredModel);
  const recipe = await chain.invoke({ ingredient: "chickpeas" });

  console.log("\n--- Structured output (Zod-validated object) ---");
  console.log(recipe);
  // `recipe` is fully typed as { name: string; minutes: number; ingredients: string[] }
  console.log("Ingredient count:", recipe.ingredients.length);
}

async function main() {
  await basicChain();
  await structuredChain();
}

main();
