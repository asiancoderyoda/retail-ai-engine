import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config();

export const getLLM = () => {
  return new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });
}

export const getEmbeddings = () => {
  return new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });
}