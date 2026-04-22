import { traceable } from "langsmith/traceable";
import { z } from "zod";
import { getLLM } from "../../config/llm";
import { AgentState } from "../../types";

const MetaSchema = z.object({
    strategy: z.enum(["inventory_focus", "demand_focus", "balanced"]),
    reasoning: z.string(),
    confidence: z.number(),
    expectedOutcome: z.string(),
    riskLevel: z.enum(["low", "medium", "high"]),
});

const llm = getLLM().withStructuredOutput(MetaSchema);

export async function basePlanner(
    state: AgentState,
    role: string,
    biasInstruction: string
) {
    const retries = state.retries ?? 0;

    /**
     * Retry guidance (role-aware, not strategy-switching)
     */
    let retryGuidance = "";

    if (retries === 0) {
        retryGuidance = `
            - Use your optimal reasoning based on your role.
        `;
    } else if (retries === 1) {
        retryGuidance = `
            - Previous approach likely failed.
            - Adjust reasoning but stay within your role.
            - Avoid repeating same logic.
        `;
    } else if (retries === 2) {
        retryGuidance = `
            - Multiple failures detected.
            - Increase caution in your decisions.
            - Reduce risk-taking.
        `;
    } else {
        retryGuidance = `
            - System struggling to converge.
            - Prioritize safe and reliable outcomes.
            - Strongly avoid past failure patterns.
        `;
    }

    const prompt = `
        You are a ${role}.

        YOUR OBJECTIVE (STRICT):
        ${biasInstruction}

        DATA:

        Inventory:
        ${JSON.stringify(state.inventory)}

        Supplier:
        ${JSON.stringify(state.supplier)}

        Past Learnings:
        ${state.ragContext || "None"}

        Previous Failure:
        ${state.critique?.reason || "None"}

        Retry Count: ${retries}

        IMPORTANT:
        - You MUST stick to your role bias
        - Do NOT change strategy randomly
        - Improve reasoning based on failures

        RETRY BEHAVIOR:
        ${retryGuidance}

        CRITICAL:
        - Avoid strategies that failed previously
        - Adapt confidence based on retry
        - Reduce risk as retries increase

        Return:
        strategy + reasoning + confidence + expectedOutcome + riskLevel
    `;

    const tracedInvoke = traceable(
        async () => llm.invoke(prompt),
        {
            name: `Planner LLM (${role})`,
            metadata: {
                sku: state.sku,
                retries,
                role,
            },
        }
    );

    return tracedInvoke();
}