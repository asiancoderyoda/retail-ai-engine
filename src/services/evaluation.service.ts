import { AgentState } from "../types";

export function evaluateDecision(state: AgentState) {
  const inventory = state.inventory;
  const decision = state.decision;
  const forecast = state.forecast;

  let score = 1.0;
  let reasons: string[] = [];

  /**
   * Penalize under-ordering
   */
  if (decision.quantity < (inventory?.reorderPoint || 0)) {
    score -= 0.4;
    reasons.push("below_reorder_point");
  }

  /**
   * Penalize over-ordering
   */
  if (decision.quantity > (forecast?.predictedDemand || 50) * 2) {
    score -= 0.3;
    reasons.push("over_ordering");
  }

  /**
   * Reward good alignment with demand
   */
  if (
    forecast &&
    Math.abs(decision.quantity - forecast.predictedDemand) <
      forecast.predictedDemand * 0.3
  ) {
    score += 0.2;
    reasons.push("aligned_with_demand");
  }

  score = Math.max(0, Math.min(1, score));

  return {
    score,
    reasons,
  };
}