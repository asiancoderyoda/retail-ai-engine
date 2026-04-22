import { AgentState } from "../types";

export async function criticAgent(state: AgentState): Promise<AgentState> {
  const { decision, inventory } = state;

  let valid = true;
  let reason = "OK";

  if (decision.quantity <= 0) {
    valid = false;
    reason = "Invalid quantity";
  }

  if (decision.quantity < (inventory?.reorderPoint || 0)) {
    valid = false;
    reason = "Below reorder point";
  }

  console.log("🧪 Critic:", { valid, reason });

  return {
    ...state,
    critique: { valid, reason },
  };
}