import { AgentState } from "../../types";
import { inventoryPlanner } from "./inventory-planner.agent";
import { demandPlanner } from "./demand-planner.agent";
import { riskPlanner } from "./risk-planner.agent";
import { calibrateConfidence } from "../../services/confidence.service";
import { getFailurePenalty } from "../../services/failure.service";

export async function debatePlanner(state: AgentState) {
  /**
   * Parallel planners
   */
  const results = await Promise.all([
    inventoryPlanner(state),
    demandPlanner(state),
    riskPlanner(state),
  ]);

  /**
   * Score each planner
   */
  const scored = await Promise.all(
    results.map(async (r) => {
      const calibrated = await calibrateConfidence(
        state.sku,
        r.confidence
      );

      const penalty = await getFailurePenalty(state.sku, {
        strategy: r.strategy,
      });

      /**
       * Risk penalty
       */
      const riskPenalty =
        r.riskLevel === "high"
          ? 0.2
          : r.riskLevel === "medium"
            ? 0.1
            : 0;

      const finalScore = calibrated - penalty - riskPenalty;

      return {
        ...r,
        calibratedConfidence: calibrated,
        failurePenalty: penalty,
        riskPenalty,
        finalScore,
      };
    })
  );

  console.log("Planner candidates:");
  scored.forEach((s) => {
    console.log(
      `${s.strategy} | score=${s.finalScore.toFixed(2)} | risk=${s.riskLevel}`
    );
  });

  /**
   * Force disagreement insight
   */
  const uniqueStrategies = new Set(scored.map((s) => s.strategy));

  if (uniqueStrategies.size === 1) {
    console.warn("All planners agreed — low diversity");
  }

  /**
   * Select best
   */
  const best = scored.sort(
    (a, b) => b.finalScore - a.finalScore
  )[0];

  console.log("Selected strategy:", best);

  return best;
}