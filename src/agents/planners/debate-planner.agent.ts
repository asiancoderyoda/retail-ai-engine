import { AgentState } from "../../types";
import { inventoryPlanner } from "./inventory-planner.agent";
import { demandPlanner } from "./demand-planner.agent";
import { riskPlanner } from "./risk-planner.agent";
import { calibrateConfidence } from "../../services/confidence.service";
import { getFailurePenalty } from "../../services/failure.service";

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
   * Calibrated confidence and failure penalty for each planner
   */
  const scored = await Promise.all(
    results.map(async (r) => {
      const calibrated = await calibrateConfidence(state.sku, r.confidence);

      const failurePenalty = await getFailurePenalty(state.sku, {
        strategy: r.strategy,
      });

      return {
        ...r,
        calibratedConfidence: calibrated,
        failurePenalty,
        finalScore: calibrated - failurePenalty,
      };
    })
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
    (a, b) => b.finalScore - a.finalScore
  )[0];

  console.log("Selected strategy:", best);

  return best;
}