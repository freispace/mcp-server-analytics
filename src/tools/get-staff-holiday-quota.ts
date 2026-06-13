import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_holiday_quota";
const TOOL_DESCRIPTION =
  "Get a staff member's holiday quota for one year: total, taken and remaining days. " +
  "Omit staff_name to get the calling user's own quota.";

const schema = z.object({
  staff_name: z
    .string()
    .optional()
    .describe(
      "Staff member name. Partial names match; the first match is used. Omit for the calling user's own staff record.",
    ),
  year: z
    .number()
    .int()
    .min(2000)
    .max(2100)
    .optional()
    .describe("Year, e.g. 2026. Defaults to the current year."),
});

type Args = z.infer<typeof schema>;

interface Response {
  staff?: { display_name: string; title?: string | null };
  year: number;
  quota_total: number;
  taken: number;
  left: number;
}

export class GetStaffHolidayQuotaTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  notFoundHint =
    'Call get_staffs with status="all" to list valid staff names, or try another year.';
  schema = schema;

  async execute(args?: Args) {
    const params = new URLSearchParams();
    if (args?.staff_name?.trim()) {
      params.append("name", args.staff_name.trim());
    }
    if (typeof args?.year === "number") {
      params.append("year", String(args.year));
    }

    const query = params.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-staffs-left-holidays${query ? `?${query}` : ""}`,
    );

    const who = data.staff?.display_name || args?.staff_name || "This user";
    const text = `Holiday quota of ${who} for ${data.year}: ${data.quota_total} days total, ${data.taken} taken, ${data.left} remaining.\n`;

    return { content: [{ type: "text" as const, text }] };
  }
}
