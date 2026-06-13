import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { DATE_REGEX, dateTime, plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_my_schedule";
const TOOL_DESCRIPTION =
  "The calling user's own bookings in a date window (default: the next 7 days). " +
  "Use it for questions like 'what is on my schedule this week'.";

const schema = z.object({
  from: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Window start, YYYY-MM-DD. Default today."),
  to: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Window end, YYYY-MM-DD (inclusive)."),
  days: z
    .number()
    .int()
    .min(1)
    .max(92)
    .optional()
    .describe(
      "Window ends this many days after start, inclusive (alternative to 'to'). Default 7.",
    ),
  weeks: z
    .number()
    .int()
    .min(1)
    .max(13)
    .optional()
    .describe("Window length in weeks (overrides 'days')."),
});

type Args = z.infer<typeof schema>;

interface Booking {
  start: string;
  end: string;
  name: string;
  project?: string | null;
  activity?: string | null;
  optional: boolean;
}

interface Response {
  from: string;
  to: string;
  timezone: string;
  bookings: Booking[];
}

export class GetMyScheduleTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;

  schema = schema;

  async execute(args?: Args) {
    const p = new URLSearchParams();
    if (args?.from) p.append("from", args.from);
    if (args?.to) p.append("to", args.to);
    if (typeof args?.days === "number") p.append("days", String(args.days));
    if (typeof args?.weeks === "number") p.append("weeks", String(args.weeks));

    const query = p.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-my-schedule${query ? `?${query}` : ""}`,
    );

    let text = `Your schedule ${data.from} to ${data.to} (${data.timezone}):\n`;

    if (data.bookings.length === 0) {
      text += `No bookings in this window.\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    text = `${plural(data.bookings.length, "booking")} ${data.from} to ${data.to} (${data.timezone}):\n`;
    for (const b of data.bookings) {
      text += `- ${dateTime(b.start)} to ${dateTime(b.end)}: ${b.name}`;
      if (b.project) text += ` · project ${b.project}`;
      if (b.activity) text += ` · ${b.activity}`;
      if (b.optional) text += ` [optional]`;
      text += `\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
