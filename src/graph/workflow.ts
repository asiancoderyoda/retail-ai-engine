/**
 * Workflow aligned with hierarchical planner
 *
 * Features:
 * - Plan-driven routing
 * - Confidence-based execution
 * - Parallel execution
 * - Retry-safe critic loop
 */

import {
  Annotation,
  StateGraph,
  END,
  START,
} from "@langchain/langgraph";
import { traceable } from "langsmith/traceable";

import { ragAgent } from "../agents/rag.agent";
import { forecastAgent } from "../agents/forecast.agent";
import { decisionAgent } from "../agents/decision.agent";
import { criticAgent } from "../agents/critic.agent";

import type { Inventory, Supplier, Forecast, PlanStep } from "../types";
import { contextNode } from "../agents/nodes/context.node";
import { retryNode } from "../agents/nodes/retry.node";
import { plannerAgent } from "../agents/planners/planner.agent";

/**
 * Graph State
 */
const GraphState = Annotation.Root({
  sku: Annotation<string>(),

  inventory: Annotation<Inventory>(),
  supplier: Annotation<Supplier | undefined>(),

  forecast: Annotation<Forecast | undefined>(),
  ragContext: Annotation<string | undefined>(),

  decision: Annotation<any>(),
  critique: Annotation<any>(),

  plan: Annotation<PlanStep[]>(),
  strategy: Annotation<string | undefined>(),
  retries: Annotation<number>(),
  error: Annotation<string | undefined>(),
});

export type GraphStateType = typeof GraphState.State;

/**
 * Safe wrapper
 */
function safeNode(fn: any, name: string) {
  return async (state: GraphStateType) => {
    const traced = traceable(
      async () => fn(state),
      {
        name,
        metadata: {
          sku: state.sku,
          retries: state.retries ?? 0,
        },
      }
    );

    try {
      return await traced();
    } catch (err: any) {
      console.error("Node failed:", err);

      return {
        ...state,
        error: err.message,
      };
    }
  };
}

/**
 * Helpers
 */

/**
 * Check if a step exists AND has good confidence
 */
function hasStep(state: GraphStateType, keyword: string) {
  return state.plan?.some(
    (s) =>
      s.step.toLowerCase().includes(keyword) &&
      s.confidence > 0.6
  );
}

/**
 * Merge node (fan-in)
 */
async function mergeNode(state: GraphStateType) {
  return state;
}

/**
 * Build Graph
 */
export function buildGraph() {
  const graph = new StateGraph(GraphState)

    /**
     * Context Node - fetches inventory, supplier, and RAG context
     */
    .addNode("contextNode", safeNode(contextNode, "Context Node"))

    /**
     * Planner
     */
    .addNode("plannerNode", safeNode(plannerAgent, "Planner Node"))

    /**
     * Capability Nodes
     */
    .addNode("ragNode", safeNode(ragAgent, "RAG Node"))
    .addNode("forecastNode", safeNode(forecastAgent, "Forecast Node"))
    .addNode("decisionNode", safeNode(decisionAgent, "Decision Node"))
    .addNode("criticNode", safeNode(criticAgent, "Critic Node"))
    .addNode("mergeNode", mergeNode)
    .addNode("retryNode", retryNode)

    /**
     * START
     */
    .addEdge(START, "contextNode")
    .addEdge("contextNode", "plannerNode")

    /**
     * Dynamic Routing FROM planner
     */
    .addConditionalEdges("plannerNode", (state: GraphStateType) => {
      const next: string[] = [];

      if (hasStep(state, "context")) {
        next.push("ragNode");
      }

      if (hasStep(state, "forecast")) {
        next.push("forecastNode");
      }

      /**
       * If nothing matches → go straight to decision
       */
      if (next.length === 0) {
        next.push("decisionNode");
      }

      return next;
    })

    /**
     * Parallel → Merge
     */
    .addEdge("ragNode", "mergeNode")
    .addEdge("forecastNode", "mergeNode")

    /**
     * Continue flow
     */
    .addEdge("mergeNode", "decisionNode")
    .addEdge("decisionNode", "criticNode")

    /**
     * Retry logic (safe)
     */
    .addConditionalEdges("criticNode", (state: GraphStateType) => {
      const retries = state.retries ?? 0;
      if (!state.critique?.valid && retries < 3) {
        return "retryNode";
      }
      return END;
    })
    .addEdge("retryNode", "decisionNode");

  return graph.compile();
}