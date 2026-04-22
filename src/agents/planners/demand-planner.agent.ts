import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function demandPlanner(state: AgentState) {
    return basePlanner(
        state,
        "demand forecasting expert",
        `
            - demand trends
            - spikes
            - seasonality
        `
    );
}