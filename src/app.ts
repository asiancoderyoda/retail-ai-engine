import readline from "readline";
import { buildGraph } from "./graph/workflow";
import { mcpTools } from "./tools/mcp.tools";
import { vectorMemory } from "./memory/vector.memory";
import { evaluateDecision } from "./services/evaluation.service";
import * as dotenv from "dotenv";
import { ensurePineConeIndex } from "./config/db";

dotenv.config();

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

async function main() {
  const graph = buildGraph();

  let result: any;

  try {
    /**
     * Run graph
     */
    result = await graph.invoke({
      sku: "SKU_1",
    });

    console.log("\n Proposed Decision:", result.decision);

    /**
     * Safety check
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
     * 👤 Human approval
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
          decision: result.decision,
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
          decision: result.decision,
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
    console.error("❌ System Error:", err.message);

    /**
     * Store FAILURE memory
     */
    try {
      await vectorMemory.add(
        result?.sku || "unknown",
        JSON.stringify({
          decision: result?.decision,
          error: err.message,
          approved: false,
          failureType: "system_error",
          timestamp: Date.now(),
        }),
        {
          type: "failure",
          score: 0, // hard penalty
          approved: false,
        }
      );
    } catch (memoryErr) {
      console.error("Failed to store failure memory:", memoryErr);
    }
  }
}

ensurePineConeIndex().then(() => {
  console.log("Pinecone index ready");
  main();
}).catch((err) => {
  console.error("Failed to ensure Pinecone index:", err);
});