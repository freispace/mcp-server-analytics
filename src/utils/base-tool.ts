import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  schema?: z.ZodObject<any>;

  register(server: McpServer) {
    server.tool(
      this.name,
      this.description,
      this.schema?.shape || {},
      this.execute.bind(this),
    );
  }

  abstract execute(args?: any): Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
}
