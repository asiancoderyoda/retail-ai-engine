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

        Rules:
        - If stock <= reorderPoint → inventory_focus
        - If demand volatility → demand_focus
        - Otherwise → balanced

        IMPORTANT:
        - Avoid low-score past decisions
        - Prefer high-score patterns

        Return:
        strategy + reasoning + confidence
    `);
}