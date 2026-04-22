import { AgentState } from "../../types";
import { mcpTools } from "../../mcp/mcp.tools";
import { vectorMemory } from "../../memory/vector.memory";

export async function contextNode(
  state: AgentState
): Promise<AgentState> {
  console.log("Context: Fetching data for", state.sku);

  try {
    const [inventory, supplier, failures, successes] = await Promise.all([
      mcpTools.getInventory(state.sku),
      mcpTools.getSupplier(state.sku),
      vectorMemory.search(
        state.sku,
        "bad decisions, failures",
        3,
        {
          score: { $lt: 0.5 }
        }
      ),
      vectorMemory.search(
        state.sku,
        "good decisions",
        2,
        {
          score: { $gt: 0.7 }
        }
      )
    ]);

    const ragContext = [
      "FAILED DECISIONS (avoid these):",
      ...failures.map(f => f.content),

      "\nSUCCESSFUL DECISIONS (prefer these):",
      ...successes.map(s => s.content),
    ].join("\n");

    return {
      ...state,
      inventory,
      supplier,
      ragContext,
    };
  } catch (err: any) {
    console.error("Context node failed:", err);

    return {
      ...state,
      error: err.message,
    };
  }
}