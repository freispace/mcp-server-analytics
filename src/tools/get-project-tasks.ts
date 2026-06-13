import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";
import { type TaskItem, taskLine } from "../utils/tasks.js";

const TOOL_NAME = "get_project_tasks";
const TOOL_DESCRIPTION =
  "Task status of one project: all tasks on the project and its bookings, " +
  "with a summary of how many are open, done and overdue.";

const schema = z.object({
  project_name: z
    .string()
    .min(1)
    .describe("Project name. Partial names match; the first match is used."),
});

type Args = z.infer<typeof schema>;

interface Response {
  project: { name: string; number?: string | null };
  summary: { total: number; open: number; done: number; overdue: number };
  tasks: TaskItem[];
}

const TASK_CAP = 50;

export class GetProjectTasksTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  notFoundHint =
    "Project names can be found via get_staff_projects for a staff member.";
  schema = schema;

  async execute(args?: Args) {
    if (!args?.project_name?.trim()) {
      throw new Error("project_name is required.");
    }

    const name = args.project_name.trim();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-project-task-status?project=${encodeURIComponent(name)}`,
    );

    let text = `Project ${data.project.name}`;
    if (data.project.number?.trim()) text += ` (#${data.project.number})`;
    text += `: ${data.summary.total} task${data.summary.total === 1 ? "" : "s"} — ${data.summary.open} open, ${data.summary.done} done, ${data.summary.overdue} overdue\n`;

    if (data.tasks.length === 0) {
      text = `Project ${data.project.name} has no tasks.\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    for (const t of data.tasks.slice(0, TASK_CAP)) text += taskLine(t);
    if (data.tasks.length > TASK_CAP) {
      text += `… ${data.tasks.length - TASK_CAP} more tasks\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
