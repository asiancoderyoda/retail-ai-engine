import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function inventoryPlanner(state: AgentState) {
    return basePlanner(
        state,
        "inventory optimization expert",
        `
            OBJECTIVE:
            - Avoid stockouts at ALL costs
            - Over-ordering is acceptable
            - Prioritize service level over cost

            You should ALWAYS lean towards inventory_focus
        `
    );
}