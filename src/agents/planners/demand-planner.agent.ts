import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function demandPlanner(state: AgentState) {
    return basePlanner(
        state,
        "demand forecasting expert",
        `
            OBJECTIVE:
            - Match demand precisely
            - Minimize overstock
            - Avoid holding costs

            You should prefer demand_focus unless inventory risk is extreme
        `
    );
}