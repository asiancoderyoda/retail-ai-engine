import { getLLM } from "../config/llm";
import { AgentState } from "../types";
import { mcpTools } from "../tools/mcp.tools";

export async function decisionAgent(state: AgentState): Promise<AgentState> {
  const inventory = state.inventory;
  const supplier = state.supplier;
  const retries = state.retries ?? 0;

  const tool = {
    name: "reorder_decision",
    description: "Decide reorder quantity",
    schema: {
      type: "object",
      properties: {
        quantity: { type: "number" },
        reason: { type: "string" },
      },
      required: ["quantity", "reason"],
    },
  };

  const res = await getLLM().invoke(
    [
      {
        role: "system",
        content: "You are an expert retail inventory optimizer.",
      },
      {
        role: "user",
        content: `
          Inventory: ${JSON.stringify(inventory)}
          Supplier: ${JSON.stringify(supplier)}
          Forecast: ${JSON.stringify(state.forecast)}
          Past Learnings: ${state.ragContext || "None"}
          Retry Attempt: ${retries}

          IMPORTANT:
          - If previous decision failed, change strategy

          Decide reorder quantity.
          `,
      },
    ],
    {
      tools: [tool],
      tool_choice: "auto",
    }
  );

  if ((state.retries ?? 0) >= 3) {
    return {
      ...state,
      decision: {
        quantity: 0,
        reason: "fallback after retries",
      },
    };
  }

  const decision = res.tool_calls?.[0]?.args || {
    quantity: 0,
    reason: "fallback",
  };

  console.log("Decision:", decision);

  return {
    ...state,
    decision,
  };
}