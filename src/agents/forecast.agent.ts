import { mcpTools } from "../mcp/mcp.tools";
import { AgentState } from "../types";

export async function forecastAgent(state: AgentState): Promise<AgentState> {
  const forecast = await mcpTools.getForecast(state.sku);
  console.log("📈 Forecast:", forecast);

  return { ...state, forecast };
}