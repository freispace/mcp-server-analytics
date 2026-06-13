import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_collaborators";
const TOOL_DESCRIPTION =
  "Show who a staff member has worked with, based on shared bookings: " +
  "each colleague with the bookings and projects they shared.";

const schema = z.object({
  staff_name: z
    .string()
    .min(1)
    .describe(
      "Staff member name. Partial names match; the first match is used.",
    ),
});

type Args = z.infer<typeof schema>;

interface StaffRef {
  display_name: string;
  title?: string | null;
}

interface Colleague {
  display_name: string;
  title?: string | null;
  bookings: Array<{ name: string; duration: string }>;
  projects: Array<{ name: string; number?: string | null }>;
}

interface Response {
  target_staff: StaffRef;
  summary: {
    unique_colleagues: number;
    bookings_involved: number;
    projects_involved: number;
  };
  colleagues: Colleague[];
}

const COLLEAGUE_CAP = 30;
const PROJECT_CAP = 5;

export class GetStaffCollaboratorsTool extends BaseTool {
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
      `/tools/analytics/get-staffs-worked-together?name=${encodeURIComponent(name)}`,
    );

    const who = data.target_staff?.display_name || name;
    const colleagues = data.colleagues ?? [];

    if (colleagues.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `${who} has no recorded collaborations on shared bookings.`,
          },
        ],
      };
    }

    let text = `${who} worked with ${data.summary.unique_colleagues} colleague${data.summary.unique_colleagues === 1 ? "" : "s"} across ${data.summary.bookings_involved} booking${data.summary.bookings_involved === 1 ? "" : "s"} and ${data.summary.projects_involved} project${data.summary.projects_involved === 1 ? "" : "s"}:\n`;

    for (const c of colleagues.slice(0, COLLEAGUE_CAP)) {
      text += `- ${c.display_name}`;
      if (c.title) text += ` (${c.title})`;
      text += ` — ${c.bookings.length} shared booking${c.bookings.length === 1 ? "" : "s"}`;
      if (c.projects.length > 0) {
        const names = c.projects.slice(0, PROJECT_CAP).map((p) => p.name);
        text += `; projects: ${names.join(", ")}`;
        if (c.projects.length > PROJECT_CAP) {
          text += ` +${c.projects.length - PROJECT_CAP} more`;
        }
      }
      text += `\n`;
    }
    if (colleagues.length > COLLEAGUE_CAP) {
      text += `… ${colleagues.length - COLLEAGUE_CAP} more colleagues\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
