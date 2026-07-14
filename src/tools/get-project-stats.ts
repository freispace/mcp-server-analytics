import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_project_stats";
const TOOL_DESCRIPTION =
  "Booking statistics for one project: how many bookings are in the past vs upcoming, with a per-status breakdown. " +
  "Also returns the project timespan: when the first booking starts, when the last booking ends (local date + time) " +
  "and the duration in days between them.";

const schema = z.object({
  project_name: z
    .string()
    .min(1)
    .describe("Project name. Partial names match; the first match is used."),
});

type Args = z.infer<typeof schema>;

interface BookingStats {
  number: number;
  percentage: number;
  by_status: Record<string, number>;
}

interface Response {
  project: {
    name: string;
    number?: string | null;
    byline?: string | null;
    description?: string | null;
  };
  timezone?: string;
  first_booking_start?: string | null;
  last_booking_end?: string | null;
  duration_days?: number | null;
  bookings_past: BookingStats;
  bookings_future: BookingStats;
}

const statusLine = (label: string, s?: BookingStats) => {
  if (!s) return "";
  let out = `${label}: ${s.number} booking${s.number === 1 ? "" : "s"} (${s.percentage}%)`;
  const statuses = Object.entries(s.by_status ?? {});
  if (statuses.length > 0) {
    out += ` — ${statuses.map(([k, v]) => `${k}: ${v}`).join(", ")}`;
  }
  return `${out}\n`;
};

export class GetProjectStatsTool extends BaseTool {
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
      `/tools/analytics/get-project-stats?name=${encodeURIComponent(name)}`,
    );

    let text = `Project ${data.project?.name || name}`;
    if (data.project?.number?.trim()) text += ` (#${data.project.number})`;
    if (data.project?.byline?.trim()) text += ` — ${data.project.byline}`;
    text += `\n`;
    if (data.project?.description?.trim()) {
      text += `${data.project.description.trim()}\n`;
    }
    if (data.first_booking_start && data.last_booking_end) {
      text += `First booking starts ${data.first_booking_start}, last booking ends ${data.last_booking_end}`;
      if (data.timezone) text += ` (${data.timezone})`;
      if (typeof data.duration_days === "number") {
        text +=
          data.duration_days === 0
            ? " — less than a day between them"
            : ` — ${data.duration_days} day${data.duration_days === 1 ? "" : "s"} between them`;
      }
      text += `.\n`;
    }
    text += statusLine("Past", data.bookings_past);
    text += statusLine("Upcoming", data.bookings_future);

    const total =
      (data.bookings_past?.number ?? 0) + (data.bookings_future?.number ?? 0);
    if (total === 0) {
      text += `This project has no bookings.\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
