import { AgentState } from "../types";

export async function criticAgent(state: AgentState): Promise<AgentState> {
  const { decision, inventory, forecast } = state;

  if (!inventory || !decision) {
    return {
      ...state,
      critique: { valid: false, reason: "Missing data" },
    };
  }

  const finalStock = inventory.stock + decision.quantity;

  let valid = true;
  let reason = "OK";

  /**
   * Basic validation
   */
  if (decision.quantity <= 0) {
    valid = false;
    reason = "Invalid quantity";
  }

  /**
   * Must reach reorder point
   */
  if (finalStock < inventory.reorderPoint) {
    valid = false;
    reason = "Does not reach reorder point";
  }

  /**
   * Over-ordering check
   */
  if (forecast) {
    const maxReasonable = forecast.predictedDemand * 2;

    if (decision.quantity > maxReasonable) {
      valid = false;
      reason = "Over ordering beyond demand";
    }
  }

  console.log("Critic:", { valid, reason, finalStock });

  return {
    ...state,
    critique: { valid, reason },
  };
}