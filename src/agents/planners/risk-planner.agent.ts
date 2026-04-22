import { basePlanner } from "./base-planner.agent";
import { AgentState } from "../../types";

export function riskPlanner(state: AgentState) {
    return basePlanner(
        state,
        "risk analyst",
        `
            - overstock risk
            - stockout risk
            - uncertainty
        `
    );
}