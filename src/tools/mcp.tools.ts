import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.MCP_URL;

export const mcpTools = {
  async getInventory(sku: string) {
    const res = await axios.post(`${BASE_URL}/tools/get_inventory`, {
      sku,
    });
    return res.data;
  },

  async getSupplier(sku: string) {
    const res = await axios.post(`${BASE_URL}/tools/get_supplier`, {
      sku,
    });
    return res.data;
  },

  async getForecast(sku: string) {
    const res = await axios.post(`${BASE_URL}/tools/predict_demand`, {
      sku,
    });
    return res.data;
  },

  async createOrder(payload: any) {
    const res = await axios.post(`${BASE_URL}/tools/create_purchase_order`, payload);
    return res.data;
  },
};