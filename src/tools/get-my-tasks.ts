import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";
import { type TaskItem, taskLine } from "../utils/tasks.js";

const TOOL_NAME = "get_my_tasks";
const TOOL_DESCRIPTION =
  "Tasks assigned to the calling user, with due date, priority and what they reference. " +
  "Default: open tasks only.";

const schema = z.object({
  include_done: z
    .boolean()
    .optional()
    .describe("Also include completed tasks. Default false."),
});

type Args = z.infer<typeof schema>;

export class GetMyTasksTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    const p = new URLSearchParams();
    if (args?.include_done) p.append("only_open", "false");

    const query = p.toString();
    const { data } = await freispaceClient.get<TaskItem[]>(
      `/tools/analytics/get-my-tasks${query ? `?${query}` : ""}`,
    );

    if (!Array.isArray(data) || data.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: args?.include_done
              ? "You have no tasks."
              : "You have no open tasks.",
          },
        ],
      };
    }

    let text = `Your ${plural(data.length, args?.include_done ? "task" : "open task")}:\n`;
    for (const t of data) text += taskLine(t);

    return { content: [{ type: "text" as const, text }] };
  }
}
