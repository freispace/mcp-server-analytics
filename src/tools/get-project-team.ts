import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_project_team";
const TOOL_DESCRIPTION =
  "List the staff members who worked on a project, with each person's number of bookings on it.";

const schema = z.object({
  project_name: z
    .string()
    .min(1)
    .describe("Project name. Partial names match; the first match is used."),
});

type Args = z.infer<typeof schema>;

interface Member {
  name: string;
  title?: string | null;
  amount_bookings: number;
}

interface Response {
  amount_staffs: number;
  staffs: Member[];
}

export class GetProjectTeamTool extends BaseTool {
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
      `/tools/analytics/get-staffs-worked-on-project?name=${encodeURIComponent(name)}`,
    );

    const staffs = data.staffs ?? [];
    if (staffs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No staff members have bookings on "${name}".`,
          },
        ],
      };
    }

    let text = `${data.amount_staffs} staff member${data.amount_staffs === 1 ? "" : "s"} worked on ${name}:\n`;
    for (const s of staffs) {
      text += `- ${s.name}`;
      if (s.title) text += ` (${s.title})`;
      text += ` — ${s.amount_bookings} booking${s.amount_bookings === 1 ? "" : "s"}\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
