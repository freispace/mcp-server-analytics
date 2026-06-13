import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_next_holiday";
const TOOL_DESCRIPTION =
  "Get a staff member's next upcoming holiday: start date, end date, length in days and comment. " +
  "Omit staff_name to get the calling user's own next holiday.";

const schema = z.object({
  staff_name: z
    .string()
    .optional()
    .describe(
      "Staff member name. Partial names match; the first match is used. Omit for the calling user's own staff record.",
    ),
});

type Args = z.infer<typeof schema>;

interface Response {
  staff?: { display_name: string; title?: string | null };
  start?: string | null;
  end?: string | null;
  length?: number | null;
  comment?: string | null;
}

export class GetStaffNextHolidayTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  notFoundHint = 'Call get_staffs with status="all" to list valid staff names.';
  schema = schema;

  async execute(args?: Args) {
    let endpoint = "/tools/analytics/get-staffs-next-holidays";
    if (args?.staff_name?.trim()) {
      endpoint += `?name=${encodeURIComponent(args.staff_name.trim())}`;
    }

    const { data } = await freispaceClient.get<Response>(endpoint);
    const who = data.staff?.display_name || args?.staff_name || "This user";

    if (!data.start) {
      return {
        content: [
          {
            type: "text" as const,
            text: `${who} has no upcoming holiday.`,
          },
        ],
      };
    }

    let text = `Next holiday of ${who}: ${data.start} to ${data.end}`;
    if (typeof data.length === "number") {
      text += ` (${data.length} day${data.length === 1 ? "" : "s"})`;
    }
    if (data.comment?.trim()) text += ` — "${data.comment.trim()}"`;
    text += `\n`;

    return { content: [{ type: "text" as const, text }] };
  }
}
