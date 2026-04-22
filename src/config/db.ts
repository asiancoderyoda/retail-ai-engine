import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index({ name: process.env.PINECONE_INDEX! });

async function ensurePineConeIndex(indexName: string = process.env.PINECONE_INDEX!) {
    const existing = await pinecone.listIndexes();

    if (!existing.indexes?.find(i => i.name === indexName)) {
        console.log("Creating Pinecone index...");

        await pinecone.createIndex({
            name: indexName,
            dimension: 1536,
            metric: "cosine",
            spec: {
                serverless: {
                    cloud: "aws",
                    region: "us-east-1",
                },
            },
            waitUntilReady: true,
        });
    }
}

const getPineConeIndex = () => index;

export {
    ensurePineConeIndex,
    getPineConeIndex,
}