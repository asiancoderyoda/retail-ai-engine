import { z } from "zod";
import { getLLM } from "../../config/llm";
import { AgentState } from "../../types";

const MetaSchema = z.object({
    strategy: z.enum(["inventory_focus", "demand_focus", "balanced"]),
    reasoning: z.string(),
    confidence: z.number(),
});

const llm = getLLM().withStructuredOutput(MetaSchema);

export async function basePlanner(
    state: AgentState,
    role: string,
    focus: string
) {
    const retries = state.retries ?? 0;

    /**
     * Adaptive behavior based on retry count
     */
    let retryGuidance = "";

    if (retries === 0) {
        retryGuidance = `
            - Use best possible strategy based on data.
        `;
    } else if (retries === 1) {
        retryGuidance = `
            - Previous strategy likely failed.
            - Try an alternative perspective.
            - Avoid repeating the same reasoning.
        `;
    } else if (retries === 2) {
        retryGuidance = `
            - Multiple failures detected.
            - Switch strategy completely.
            - Prefer safer and more conservative approach.
        `;
    } else {
        retryGuidance = `
            - System struggling to converge.
            - Choose the safest and most reliable strategy.
            - Prioritize avoiding stockout over optimization.
        `;
    }

    return llm.invoke(`
        You are a ${role}.

        Focus ONLY on:
        ${focus}

        Learn from past decisions.

        Inventory:
        ${JSON.stringify(state.inventory)}

        Supplier:
        ${JSON.stringify(state.supplier)}

        Past Learnings:
        ${state.ragContext || "None"}

        Previous Failure Signal:
        ${state.critique?.reason || "None"}

        Retry Count: ${retries}

        Rules:
        - If stock <= reorderPoint → inventory_focus
        - If demand volatility → demand_focus
        - Otherwise → balanced

        IMPORTANT:
        - Avoid low-score past decisions
        - Prefer high-score patterns

        RETRY STRATEGY:
        ${retryGuidance}

        CRITICAL:
        - DO NOT repeat same strategy if it previously failed
        - Adjust reasoning based on retry count
        - Be more conservative as retries increase

        Return:
        strategy + reasoning + confidence
    `);
}