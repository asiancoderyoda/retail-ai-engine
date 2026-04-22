import { vectorMemory } from "../memory/vector.memory";

export async function getFailurePenalty(
  sku: string,
  signal: { strategy?: "inventory_focus" | "demand_focus" | "balanced"; quantity?: number }
) {
  const history = await vectorMemory.search(
    sku,
    "failed decisions",
    10,
    {
      approved: { $eq: false },
    }
  );

  let penalty = 0;

  for (const h of history) {
    try {
      const parsed = JSON.parse(h?.content as string || "{}");

      /**
       * Same strategy failure
       */
      if (parsed?.decision?.strategy === signal.strategy) {
        penalty += 0.15;
      }

      /**
       * Same quantity failure (stronger)
       */
      if (parsed?.decision?.quantity === signal.quantity) {
        penalty += 0.25;
      }

    } catch {}
  }

  return Math.min(penalty, 0.7);
}