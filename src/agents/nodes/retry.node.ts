/**
 * Retry Logic. Disabled for now to save costs, 
 * but this is where you would implement a retry loop based on the critique.
*/
import { AgentState } from "../../types";

export async function retryNode(state: AgentState): Promise<AgentState> {
    const retries = (state.retries ?? 0) + 1;

    console.log(`🔁 Retry ${retries}`);

    return {
        ...state,
        retries,
        _trace: {
            retry: retries,
        },
    };
}