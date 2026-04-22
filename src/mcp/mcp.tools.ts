import { MCPClient } from "./mcp.client";
import type { Inventory, Supplier, Forecast } from "../types";

const mcp = MCPClient.getInstance();

export const mcpTools = {
  getInventory: (sku: string) =>
    mcp.callTool<Inventory>("get_inventory", { sku }),

  getSupplier: (sku: string) =>
    mcp.callTool<Supplier>("get_supplier", { sku }),

  getForecast: (sku: string) =>
    mcp.callTool<Forecast>("predict_demand", { sku }),

  createOrder: (payload: {
    sku: string;
    quantity: number;
    supplierId: string;
  }) =>
    mcp.callTool<{ orderId: string }>(
      "create_purchase_order",
      payload
    ),
};