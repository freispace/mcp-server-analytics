import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "search_docs";
const TOOL_DESCRIPTION =
  "Search the freispace documentation. Returns the most relevant excerpts. " +
  "Use it for questions about how freispace itself works (features, settings, how-tos).";

const schema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The question or keywords to search the documentation for."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum number of excerpts. Default 5."),
});

type Args = z.infer<typeof schema>;

interface Result {
  file_path: string;
  content: string;
  similarity: number;
}

interface Response {
  results: Result[];
}

// The API returns thresholdless top-k; drop chunks that are clearly
// irrelevant so nonsense queries return "not found" instead of noise.
const MIN_SIMILARITY = 0.45;

export class SearchDocsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    if (!args?.query?.trim()) {
      throw new Error("query is required.");
    }

    const { data } = await freispaceClient.post<Response>(
      "/tools/knowledge/docs/search",
      {
        query: args.query.trim(),
        ...(typeof args.limit === "number" ? { limit: args.limit } : {}),
      },
    );

    const results = (data.results ?? []).filter(
      (r) => r.similarity >= MIN_SIMILARITY,
    );
    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No documentation found for "${args.query.trim()}". Try different keywords.`,
          },
        ],
      };
    }

    let text = `Documentation excerpts for "${args.query.trim()}":\n\n`;
    for (const [i, r] of results.entries()) {
      text += `${i + 1}. [${r.file_path}]\n${r.content.trim()}\n\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
