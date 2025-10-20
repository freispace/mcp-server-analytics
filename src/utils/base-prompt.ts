import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export abstract class BasePrompt {
  abstract name: string;
  abstract description: string;
  schema?: z.ZodObject<any>;

  register(server: McpServer) {
    server.prompt(
      this.name,
      this.description,
      this.schema?.shape || {},
      this.execute.bind(this),
    );
  }

  abstract execute(args?: any): Promise<{
    description?: string;
    messages: Array<{
      role: "user" | "assistant";
      content: {
        type: "text";
        text: string;
      };
    }>;
  }>;
}
