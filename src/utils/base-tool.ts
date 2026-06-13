import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  schema?: z.ZodObject<any>;
  /** Appended to "not found" errors — tell the model how to recover. */
  notFoundHint?: string;

  register(server: McpServer) {
    server.tool(
      this.name,
      this.description,
      this.schema?.shape || {},
      async (args: any): Promise<ToolResult> => {
        try {
          return await this.execute(args);
        } catch (error) {
          let message = error instanceof Error ? error.message : String(error);
          if (this.notFoundHint && /not found/i.test(message)) {
            message += ` ${this.notFoundHint}`;
          }
          console.error(`${this.name} failed:`, message);
          return {
            content: [{ type: "text", text: message }],
            isError: true,
          };
        }
      },
    );
  }

  abstract execute(args?: any): Promise<ToolResult>;
}
