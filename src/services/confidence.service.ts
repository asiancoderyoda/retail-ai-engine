import { vectorMemory } from "../memory/vector.memory";

export async function calibrateConfidence(
    sku: string,
    rawConfidence: number
) {
    const history = await vectorMemory.search(
        sku,
        "evaluation score",
        10
    );

    let weightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < history.length; i++) {
        try {
            const parsed = JSON.parse(history[i]?.content as string || "{}");

            const score = parsed?.evaluation?.score ?? 0;
            const approved = parsed?.approved;

            /**
             * 🔥 KEY: failures get MORE weight
             */
            const weight = approved ? 1 : 2;

            weightedScore += score * weight;
            totalWeight += weight;
        } catch { }
    }

    if (totalWeight === 0) return rawConfidence;

    const avgScore = weightedScore / totalWeight;

    /**
     * Slight bias towards real performance
     */
    return 0.4 * rawConfidence + 0.6 * avgScore;
}