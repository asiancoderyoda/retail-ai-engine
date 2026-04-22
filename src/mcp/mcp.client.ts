import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as dotenv from "dotenv";

dotenv.config();

type MCPTextBlock = {
    type: "text";
    text: string;
};

export class MCPClient {
    private static instance: MCPClient;

    private client: Client | null = null;
    private initializing: Promise<Client> | null = null;
    private isConnected: boolean = false;

    private constructor() { }

    /**
     * Singleton accessor
     */
    public static getInstance(): MCPClient {
        if (!MCPClient.instance) {
            MCPClient.instance = new MCPClient();
        }
        return MCPClient.instance;
    }

    /**
     * Ensure connection
     */
    private async connect(): Promise<Client> {
        if (this.client && this.isConnected) return this.client;

        if (this.initializing) return this.initializing;

        this.initializing = (async () => {
            const mcpUrl = process.env.MCP_URL;
            if (!mcpUrl) throw new Error("MCP_URL is not set");

            const client = new Client({
                name: "retail-ai-engine",
                version: "1.0.0",
            });

            const transport = new StreamableHTTPClientTransport(
                new URL(`${mcpUrl}/mcp`)
            );

            try {
                await client.connect(transport);

                this.client = client;
                this.isConnected = true;

                console.log("MCP connected");

                return client;
            } catch (err: any) {
                /**
                 * If already initialized → reuse instead of failing
                 */
                if (
                    err?.message?.includes("already initialized")
                ) {
                    console.warn("MCP already initialized — reusing session");

                    this.client = client;
                    this.isConnected = true;

                    return client;
                }

                console.error("MCP connection failed:", err);

                this.client = null;
                this.initializing = null;
                this.isConnected = false;

                throw err;
            }
        })();

        return this.initializing;
    }

    /**
     * Call tool safely
     */
    public async callTool<T = unknown>(
        name: string,
        args: Record<string, unknown>
    ): Promise<T> {
        const client = await this.connect();

        /**
         * Timeout protection
         */
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("MCP timeout")), 5000)
        );

        const result = await Promise.race([
            client.callTool({ name, arguments: args }),
            timeout,
        ]) as any;

        if (result.isError) {
            throw new Error(
                `MCP tool "${name}" failed: ${JSON.stringify(result.content)}`
            );
        }

        const content = result.content as unknown[];

        const textBlock = content.find(
            (c): c is MCPTextBlock =>
                typeof c === "object" &&
                c !== null &&
                (c as any).type === "text" &&
                typeof (c as any).text === "string"
        );

        if (!textBlock) {
            throw new Error(
                `MCP tool "${name}" returned no text content`
            );
        }

        try {
            return JSON.parse(textBlock.text) as T;
        } catch {
            return textBlock.text as unknown as T;
        }
    }
}