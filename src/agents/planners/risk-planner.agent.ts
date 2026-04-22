import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function riskPlanner(state: AgentState) {
    return basePlanner(
        state,
        "risk analyst",
        `
            OBJECTIVE:
            - Balance stockout risk vs overstock cost
            - Avoid extreme decisions
            - Prefer stability

            You should prefer balanced strategy
        `
    );
}