interface Inventory {
  sku: string;
  stock: number;
  reorderPoint: number;
}

interface Supplier {
  sku: string;
  supplierId: string;
  leadTimeDays: number;
  moq: number;
}

interface Forecast {
  sku: string;
  predictedDemand: number;
}

interface PlanStep {
  step: string;
  confidence: number;
};

interface AgentState {
  sku: string;
  inventory?: Inventory;
  supplier?: Supplier;
  forecast?: Forecast;
  decision?: any;
  critique?: any;
  ragContext?: string;
  plan?: PlanStep[];
  error?: string;
  retries?: number;
  strategy?: string;
}

export type { AgentState, Inventory, Supplier, Forecast, PlanStep };