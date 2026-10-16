# langgraph-learning

A hands-on playground for learning **LangChain** and **LangGraph** in TypeScript. Every file is runnable on its own and heavily commented — the code is the tutorial.

## Setup

```bash
pnpm install
cp .env.example .env   # then paste your OpenAI key in
```

Uses `gpt-4o-mini` throughout to keep costs near-zero while you experiment. Swap `ChatOpenAI` for `ChatAnthropic` / `ChatOllama` any time — that's the whole point of section 01.

## Learning path

Go in this order — each section builds a concept the next one relies on.

### 01 — LangChain basics (no LangGraph yet)
| Command | What it teaches |
|---|---|
| `pnpm 01:llm` | The `BaseChatModel` interface — one shape works across every provider |
| `pnpm 01:prompt` | `ChatPromptTemplate` — parameterized, inspectable prompts |
| `pnpm 01:chain` | LCEL `.pipe()` composition + structured/typed output via Zod |

### 02 — Tools
| Command | What it teaches |
|---|---|
| `pnpm 02:tool` | Defining a tool with `tool()` + a Zod schema |
| `pnpm 02:toolcall` | The full manual loop: model requests a call → you run it → you feed the result back |

### 03 — LangGraph (the main event)
| Command | What it teaches |
|---|---|
| `pnpm 03:basic` | `StateGraph`, `Annotation`, nodes, and fixed edges |
| `pnpm 03:router` | `addConditionalEdges` — the graph picks its own next step |
| `pnpm 03:agent` | A hand-built ReAct loop (`agent` ⇄ `tools`) — the pattern behind every "AI agent" |

### 04 — Memory
| Command | What it teaches |
|---|---|
| `pnpm 04:memory` | `MemorySaver` checkpointers + `thread_id` — persistent, resumable conversations |

## Why LangGraph instead of just chains?

A plain LCEL chain (section 01) is a **straight line**: A → B → C, run once, done. The moment you need any of the following, you need a graph instead of a chain:

- **Loops** — "keep calling tools until the model is satisfied" (section 03, agent)
- **Branches** — "route to a different handler depending on the input" (section 03, router)
- **Persistence** — "resume this exact conversation tomorrow" (section 04)
- **Human-in-the-loop** — pause mid-execution for approval, then continue (not covered here, but built on the same checkpointer mechanism as section 04)

LangGraph models your app as `state + nodes + edges` and compiles it into something inspectable, resumable, and loopable — none of which a `.pipe()` chain gives you.

## Suggested next steps once you're through all of this

- Swap `MemorySaver` for a real checkpointer (`@langchain/langgraph-checkpoint-sqlite` or `-postgres`) so memory survives a restart.
- Try `createReactAgent` from `@langchain/langgraph/prebuilt` — the one-liner version of `03-langgraph/agent-with-tools.ts`.
- Add a retrieval node (RAG): a `vectorStore.similaritySearch()` call as just another node in a graph.
- Turn on tracing to *see* the graph execute step by step: set `LANGCHAIN_TRACING_V2=true` and a `LANGCHAIN_API_KEY` in `.env` (free tier at [smith.langchain.com](https://smith.langchain.com)), then re-run any script — every node call shows up as a trace.
- Try `graph.stream()` instead of `graph.invoke()` in any 03/04 file to watch state updates arrive node-by-node instead of waiting for the final result.

## Project layout

```
src/
  01-basics/            plain LangChain — models, prompts, chains
  02-tools/             defining tools and manual tool-calling
  03-langgraph/         StateGraph, routing, and the agent loop
  04-memory/            checkpointers and thread-based memory
```
