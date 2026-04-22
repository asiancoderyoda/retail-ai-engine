import { AgentState } from "../../types";
import { inventoryPlanner } from "./inventory-planner.agent";
import { demandPlanner } from "./demand-planner.agent";
import { riskPlanner } from "./risk-planner.agent";
import { calibrateConfidence } from "../../services/confidence.service";

export async function debatePlanner(state: AgentState) {
  /**
   * Parallel execution of planners
   */
  const results = await Promise.all([
    inventoryPlanner(state),
    demandPlanner(state),
    riskPlanner(state),
  ]);

  /**
   * Add calibrated confidence
   */
  const scored = await Promise.all(
    results.map(async (r) => ({
      ...r,
      calibratedConfidence: await calibrateConfidence(
        state.sku,
        r.confidence
      ),
    }))
  );

  console.log("Planner candidates:", scored);

  console.log("Reasonings:");
  scored.forEach((s) =>
    console.log(`- ${s.strategy}: ${s.reasoning}`)
  );


  /**
   * Pick best
   */
  const best = scored.sort(
    (a, b) => b.calibratedConfidence - a.calibratedConfidence
  )[0];

  console.log("Selected strategy:", best);

  return best;
}