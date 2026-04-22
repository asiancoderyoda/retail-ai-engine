import { getLLM } from "../config/llm";
import { AgentState } from "../types";
import { mcpTools } from "../tools/mcp.tools";
import { getFailurePenalty } from "../services/failure.service";

export async function decisionAgent(state: AgentState): Promise<AgentState> {
  const inventory = state.inventory;
  const supplier = state.supplier;
  const retries = state.retries ?? 0;
  const gap = (inventory?.reorderPoint || 0) - (inventory?.stock || 0);

  let strategyHint = "";

  if (retries === 1) {
    strategyHint = "Be slightly more aggressive.";
  } else if (retries === 2) {
    strategyHint = "Take a conservative but safe decision.";
  } else if (retries >= 3) {
    strategyHint = "Fallback to safe reorder logic.";
  }

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
          Retry Attempts: ${retries}
          Strategy Hint: ${strategyHint}

          IMPORTANT:
          - NEVER repeat the same decision if it failed
          - If retry > 0 → change strategy
          - NEVER return quantity = 0
          - Increase aggressiveness slightly on each retry

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
        quantity: Math.max(gap, state?.supplier?.moq || 0),
        reason: "fallback after retries",
      },
    };
  }

  const decision = res.tool_calls?.[0]?.args || {
    quantity: Math.max(gap, state?.supplier?.moq || 0),
    reason: "fallback",
  };

  console.log("Decision:", decision);

  const penalty = await getFailurePenalty(state.sku, {
    quantity: decision.quantity,
  });

  if (penalty > 0.4) {
    console.log("High failure penalty → adjusting decision");

    decision.quantity = Math.max(
      gap,
      supplier?.moq || 0
    );
  }

  return {
    ...state,
    decision,
  };
}