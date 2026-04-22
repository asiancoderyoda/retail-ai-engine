import { AgentState } from "../types";
import { vectorMemory } from "../memory/vector.memory";

export async function ragAgent(state: AgentState): Promise<AgentState> {
  const query = `inventory decision for ${state.sku}`;

  const results = await vectorMemory.search(state.sku, query);

  const context = results.map((r) => r.content).join("\n");

  console.log("📚 RAG Context:", context);

  return {
    ...state,
    ragContext: context,
  };
}