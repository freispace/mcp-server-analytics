import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";
import { type TaskItem, taskLine } from "../utils/tasks.js";

const TOOL_NAME = "get_open_tasks";
const TOOL_DESCRIPTION =
  "All open (not yet completed) tasks of the team, with assignees, due dates and what they reference. " +
  "For only the calling user's own tasks use get_my_tasks.";

const schema = z.object({
  reference: z
    .enum(["project", "booking", "user"])
    .optional()
    .describe("Only tasks referencing this kind of entity. Omit for all."),
});

type Args = z.infer<typeof schema>;

const TASK_CAP = 50;

export class GetOpenTasksTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    const p = new URLSearchParams();
    if (args?.reference) p.append("reference", args.reference);

    const query = p.toString();
    const { data } = await freispaceClient.get<TaskItem[]>(
      `/tools/analytics/get-open-tasks${query ? `?${query}` : ""}`,
    );

    if (!Array.isArray(data) || data.length === 0) {
      const scope = args?.reference ? ` referencing a ${args.reference}` : "";
      return {
        content: [
          {
            type: "text" as const,
            text: `No open team tasks${scope}.`,
          },
        ],
      };
    }

    let text = `${plural(data.length, "open team task")}:\n`;
    for (const t of data.slice(0, TASK_CAP)) text += taskLine(t);
    if (data.length > TASK_CAP) {
      text += `… ${data.length - TASK_CAP} more tasks\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
