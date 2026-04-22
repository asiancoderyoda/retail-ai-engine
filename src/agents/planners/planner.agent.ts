/**
 * Main Planner Agent (Hierarchical)
 *
 * Flow:
 * 1. Meta planner → decides strategy -> Used by debate planner to run multiple meta planners and select best strategy
 * 2. Sub planner → generates steps
 */

import { AgentState } from "../../types";
import { subPlanner } from "./sub-planner.agent";
import { debatePlanner } from "./debate-planner.agent";

export async function plannerAgent(
  state: AgentState
): Promise<AgentState> {
  console.log("Planner (debate + memory)");

  try {
    const meta = await debatePlanner(state);

    const plan = await subPlanner(state, meta.strategy);

    return {
      ...state,
      plan,
      strategy: meta.strategy,
    };
  } catch (err: any) {
    console.error("Planner failed:", err);

    return {
      ...state,
      error: err.message,
    };
  }
}