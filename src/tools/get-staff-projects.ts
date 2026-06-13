import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_projects";
const TOOL_DESCRIPTION =
  "List the projects a staff member is booked on, with each project's date range and duration in days.";

const schema = z.object({
  staff_name: z
    .string()
    .min(1)
    .describe(
      "Staff member name. Partial names match; the first match is used.",
    ),
});

type Args = z.infer<typeof schema>;

interface Project {
  name: string;
  number?: string | null;
  start: string;
  end: string;
  duration_days: number;
}

interface Response {
  projects: Project[];
}

export class GetStaffProjectsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  notFoundHint = 'Call get_staffs with status="all" to list valid staff names.';
  schema = schema;

  async execute(args?: Args) {
    if (!args?.staff_name?.trim()) {
      throw new Error("staff_name is required.");
    }

    const name = args.staff_name.trim();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-staff-projects?name=${encodeURIComponent(name)}`,
    );

    const projects = data.projects ?? [];
    if (projects.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No projects found for "${name}".`,
          },
        ],
      };
    }

    let text = `${projects.length} project${projects.length === 1 ? "" : "s"} for ${name}:\n`;
    for (const p of projects) {
      text += `- ${p.name}`;
      if (p.number?.trim()) text += ` (#${p.number})`;
      text += ` — ${p.start} to ${p.end} (${p.duration_days} day${p.duration_days === 1 ? "" : "s"})\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
