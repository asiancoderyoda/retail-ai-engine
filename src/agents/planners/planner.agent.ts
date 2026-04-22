import { AgentState } from "../../types";
import { subPlanner } from "./sub-planner.agent";
import { debatePlanner } from "./debate-planner.agent";

export async function plannerAgent(
  state: AgentState
): Promise<AgentState> {
  console.log("Planner (intelligent debate)");

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