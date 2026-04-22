import { traceable } from "langsmith/traceable";
import { getLLM } from "../config/llm";
import { AgentState } from "../types";
import { getFailurePenalty } from "../services/failure.service";

export async function decisionAgent(state: AgentState): Promise<AgentState> {
  const inventory = state.inventory!;
  const supplier = state.supplier!;
  const retries = state.retries ?? 0;

  const stock = inventory.stock;
  const reorderPoint = inventory.reorderPoint;

  /**
   * Deterministic baseline
   */
  const safetyBuffer = 10;
  const targetStock = reorderPoint + safetyBuffer;

  const gap = reorderPoint - stock;
  const targetGap = targetStock - stock;

  let baselineQty = Math.max(
    gap,
    targetGap,
    supplier.moq
  );

  /**
   * Retry scaling
   */
  baselineQty += retries * 2;

  /**
   * Planner signal
   */
  const planHint =
    state.plan?.map((p) => `${p.step}(${p.confidence})`).join(", ") ||
    "none";

  /**
   * Retry guidance
   */
  let strategyHint = "";
  if (retries === 1) {
    strategyHint = "Increase quantity moderately.";
  } else if (retries === 2) {
    strategyHint = "Increase quantity significantly.";
  } else if (retries >= 3) {
    strategyHint = "Use safe deterministic fallback.";
  }

  const tool = {
    name: "reorder_decision",
    description: "Decide reorder quantity",
    schema: {
      type: "object",
      properties: {
        quantity: { type: "number" },
        reason: { type: "string" },
      },
      required: ["quantity", "reason"],
    },
  };

  const messages = [
    {
      role: "system",
      content: "You are an expert retail inventory optimizer.",
    },
    {
      role: "user",
      content: `
        Inventory: ${JSON.stringify(inventory)}
        Supplier: ${JSON.stringify(supplier)}
        Forecast: ${JSON.stringify(state.forecast)}
        Past Learnings: ${state.ragContext || "None"}

        Execution Plan:
        ${planHint}

        Retry Attempts: ${retries}
        Strategy Hint: ${strategyHint}

        Previous Failure:
        ${state.critique?.reason || "None"}

        Previous Quantity:
        ${state.decision?.quantity || "None"}

        STRICT RULES:
        - Quantity MUST ensure final stock >= reorder point
        - Prefer reaching target stock (reorderPoint + buffer)
        - NEVER return quantity = 0
        - DO NOT repeat failed quantity
        - Adjust using failure reason

        Return reorder quantity.
      `,
    },
  ];

  const tracedDecision = traceable(
    async () => {
      const res = await getLLM().invoke(messages, {
        tools: [tool],
        tool_choice: "auto",
      });

      /**
       * Extract decision safely
       */
      let decision = res.tool_calls?.[0]?.args;

      /**
       * Strong validation
       */
      if (
        !decision ||
        typeof decision.quantity !== "number" ||
        !Number.isFinite(decision.quantity) ||
        decision.quantity <= 0
      ) {
        decision = {
          quantity: baselineQty,
          reason: "invalid_llm_output_fallback",
        };
      }

      /**
       * Hard fallback on retries
       */
      if (retries >= 3) {
        decision = {
          quantity: baselineQty,
          reason: "fallback_after_retries",
        };
      }

      /**
       * Failure penalty (quantity-level)
       */
      const penalty = await getFailurePenalty(state.sku, {
        quantity: decision.quantity,
      });

      if (penalty > 0.4) {
        console.log("⚠️ High failure penalty → forcing baseline");

        decision.quantity = baselineQty;
        decision.reason = "penalty_adjusted";
      }

      /**
       * HARD CONSTRAINT
       * Ensure reorderPoint is actually met
       */
      const finalStock = stock + decision.quantity;

      if (finalStock < reorderPoint) {
        decision.quantity = Math.max(
          baselineQty,
          reorderPoint - stock
        );

        decision.reason = "constraint_fix_reorder_point";
      }

      /**
       * FINAL ENFORCEMENT
       */
      decision.quantity = Math.max(decision.quantity, baselineQty);

      return decision;
    },
    {
      name: "Decision Agent",
      metadata: {
        sku: state.sku,
        retries,
        baselineQty,
        hasForecast: !!state.forecast,
        hasContext: !!state.ragContext,
      },
    }
  );

  const decision = await tracedDecision();

  console.log("Decision:", decision);

  return {
    ...state,
    decision,
  };
}