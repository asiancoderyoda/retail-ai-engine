import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function inventoryPlanner(state: AgentState) {
    return basePlanner(
        state,
        "inventory optimization expert",
        `
            - stock levels
            - reorder point
            - supplier lead time
        `
    );
}