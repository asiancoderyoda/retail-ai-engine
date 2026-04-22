import { vectorMemory } from "../memory/vector.memory";

export async function calibrateConfidence(
    sku: string,
    rawConfidence: number
) {
    const history = await vectorMemory.search(
        sku,
        "evaluation score",
        5
    );

    const scores = history
        .map((h) => {
            try {
                return JSON.parse(h?.content as string || "{}").evaluation?.score;
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    if (scores.length === 0) return rawConfidence;

    const avgScore =
        scores.reduce((a, b) => a + b, 0) / scores.length;

    /**
     * Blend LLM confidence with actual performance
     */
    return 0.5 * rawConfidence + 0.5 * avgScore;
}