import * as dotenv from "dotenv";
import readline from "readline";
import { traceable } from "langsmith/traceable";

import { buildGraph } from "./graph/workflow";
import { mcpTools } from "./mcp/mcp.tools";
import { vectorMemory } from "./memory/vector.memory";
import { evaluateDecision } from "./services/evaluation.service";
import { ensurePineConeIndex } from "./config/db";

dotenv.config();

/**
 * CLI approval helper
 */
function askApproval(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + " (y/n): ", (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * Main execution flow
 */
async function main() {
  const graph = buildGraph();

  let result: any;

  try {
    /**
     * Run LangGraph
     */
    result = await graph.invoke({
      sku: "SKU_1",
    });

    console.log("\n Proposed Decision:", result.decision);

    /**
     * Safety validation
     */
    if (!result?.decision || typeof result.decision.quantity !== "number") {
      throw new Error("Invalid decision output");
    }

    /**
     * Evaluate decision
     */
    const evaluation = evaluateDecision(result);
    console.log("📊 Evaluation:", evaluation);

    /**
     * Human approval
     */
    const approved = await askApproval("Approve this order?");

    if (approved) {
      /**
       * Execute order
       */
      const res = await mcpTools.createOrder({
        sku: result.sku,
        quantity: result.decision.quantity,
        supplierId: result?.supplier?.supplierId,
      });

      console.log("Order Executed:", res);

      /**
       * Store SUCCESS memory
       */
      await vectorMemory.add(
        result.sku,
        JSON.stringify({
          decision: {
            ...result.decision,
            strategy: result.strategy,
          },
          evaluation,
          approved: true,
          timestamp: Date.now(),
        }),
        {
          type: "evaluation",
          score: evaluation.score,
          approved: true,
        }
      );
    } else {
      console.log("Order Rejected");

      /**
       * Store REJECTION memory
       */
      await vectorMemory.add(
        result.sku,
        JSON.stringify({
          decision: {
            ...result.decision,
            strategy: result.strategy,
          },
          evaluation,
          approved: false,
          reason: "user_rejected",
          timestamp: Date.now(),
        }),
        {
          type: "evaluation",
          score: evaluation.score,
          approved: false,
        }
      );
    }
  } catch (err: any) {
    console.error("System Error:", err.message);

    /**
     * Store FAILURE memory
     */
    try {
      await vectorMemory.add(
        result?.sku || "unknown",
        JSON.stringify({
          decision: {
            ...result?.decision,
            strategy: result?.strategy,
          },
          error: err.message,
          approved: false,
          failureType: "system_error",
          timestamp: Date.now(),
        }),
        {
          type: "failure",
          score: 0,
          approved: false,
        }
      );
    } catch (memoryErr) {
      console.error("Failed to store failure memory:", memoryErr);
    }

    /**
     * IMPORTANT: rethrow so LangSmith marks failure
     */
    throw err;
  }
}

/**
 * LangSmith trace wrapper
 */
const tracedMain = traceable(main, {
  name: "Retail Decision Flow",
  metadata: {
    system: "retail-ai-engine",
    version: "v1",
  },
});

/**
 * Bootstrap
 */
ensurePineConeIndex()
  .then(async () => {
    console.log("Pinecone index ready");

    await tracedMain({
      metadata: {
        sku: "SKU_1",
        runType: "demo",
        timestamp: Date.now(),
      },
    });
  })
  .catch((err) => {
    console.error("Failed to ensure Pinecone index:", err);
  });