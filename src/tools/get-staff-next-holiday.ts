import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_next_holiday";
const TOOL_DESCRIPTION =
  "Get ALL upcoming holiday blocks of a staff member plus their next work day — " +
  "the day they are actually back at work, accounting for working times, shifts, " +
  "public holidays and other absences. To answer 'when is X back?' always use the " +
  "returned next work day; never derive it from a holiday's end date (the staff " +
  "may have days off, public holidays or further absences right after it). " +
  "Omit staff_name to get the calling user's own holidays.";

const schema = z.object({
  staff_name: z
    .string()
    .optional()
    .describe(
      "Staff member name. Partial names match; the first match is used. Omit for the calling user's own staff record.",
    ),
});

type Args = z.infer<typeof schema>;

interface HolidayBlock {
  start: string;
  end: string;
  days: number;
  calendar_days: number;
  comment?: string | null;
}

interface Response {
  staff?: { display_name: string; title?: string | null };
  timezone?: string;
  on_holiday_today?: boolean;
  next_work_day?: string | null;
  holidays?: HolidayBlock[];
  start?: string | null;
  end?: string | null;
  length?: number | null;
  comment?: string | null;
}

const formatBlock = (block: HolidayBlock): string => {
  const range =
    block.start === block.end ? block.start : `${block.start} to ${block.end}`;
  let line = `- ${range} (${block.days} vacation day${block.days === 1 ? "" : "s"})`;
  if (block.comment?.trim()) line += ` — "${block.comment.trim()}"`;
  return line;
};

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

    const blocks: HolidayBlock[] =
      data.holidays ??
      (data.start
        ? [
            {
              start: data.start,
              end: data.end ?? data.start,
              days: data.length ?? 0,
              calendar_days: 0,
              comment: data.comment,
            },
          ]
        : []);

    const lines: string[] = [];

    if (data.on_holiday_today) {
      lines.push(`${who} is on holiday today.`);
    }

    if (data.next_work_day) {
      lines.push(
        `Next work day of ${who}: ${data.next_work_day} — this is when they are actually (back) at work; it already accounts for their work schedule, shifts, public holidays and all absences.`,
      );
    } else if (data.next_work_day === null) {
      lines.push(`${who} has no scheduled work day within the next two years.`);
    }

    if (blocks.length === 0) {
      lines.push(`${who} has no upcoming holiday.`);
    } else {
      lines.push(
        `Upcoming holiday${blocks.length === 1 ? "" : "s"} of ${who}:`,
        ...blocks.map(formatBlock),
      );
    }

    return {
      content: [{ type: "text" as const, text: `${lines.join("\n")}\n` }],
    };
  }
}
