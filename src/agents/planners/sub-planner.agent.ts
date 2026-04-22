/**
 * Sub Planner
 *
 * Converts strategy → execution steps
 */

import { AgentState, PlanStep } from "../../types";

export async function subPlanner(
  state: AgentState,
  strategy: string
): Promise<PlanStep[]> {
  if (strategy === "inventory_focus") {
    return [
      { step: "analyze inventory", confidence: 0.9 },
      { step: "make decision", confidence: 0.85 },
    ];
  }

  if (strategy === "demand_focus") {
    return [
      { step: "forecast demand", confidence: 0.9 },
      { step: "make decision", confidence: 0.85 },
    ];
  }

  return [
    { step: "forecast demand", confidence: 0.9 },
    { step: "make decision", confidence: 0.85 },
  ];
}