import { createHash } from "crypto";
import { getEmbeddings } from "../config/llm";
import { getPineConeIndex } from "../config/db";

const index = getPineConeIndex();

const embeddings = getEmbeddings();

export const vectorMemory = {
  /**
   * Add memory (now supports structured metadata)
   */
  async add(
    sku: string,
    content: string,
    metadataExtras: {
      type?: string;
      score?: number;
      approved?: boolean;
    } = {}
  ) {
    const [embedding] = await embeddings.embedDocuments([content]);

    const hash = createHash("sha256")
      .update(content)
      .digest("hex");

    const id = `${sku}-${hash}`;

    const namespace = index.namespace(sku);

    await namespace.upsert({
      records: [
        {
          id,
          values: embedding,
          metadata: {
            sku,
            content,
            type: metadataExtras.type || "decision",
            score: metadataExtras.score || 0,
            approved: metadataExtras.approved || false,
            createdAt: Date.now(),
          },
        },
      ],
    });

    console.log("Memory stored:", {
      content,
      ...metadataExtras,
    });
  },

  /**
   * Search memory (now supports filtering)
   */
  async search(
    sku: string,
    query: string,
    topK = 5,
    filter?: any
  ) {
    const queryEmbedding = await embeddings.embedQuery(query);

    const namespace = index.namespace(sku);

    const result = await namespace.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });

    return (
      result.matches?.map((match) => ({
        content: match.metadata?.content || "",
        score: match.score,
        metadata: match.metadata,
      })) || []
    );
  },
};