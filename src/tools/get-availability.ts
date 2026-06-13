import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { DATE_REGEX, dateTime, plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_availability";
const TOOL_DESCRIPTION =
  "Check when staff, rooms (suites) or resources are FREE in a date window (default 14 days, max 92). " +
  "Considers bookings, public holidays and staff absences/work times. " +
  "Returns free time slots and fully-free days per entity, and whether a required duration fits. " +
  "Select entities with search/site/status (names from find_resources).";

const schema = z.object({
  type: z
    .enum(["staff", "resource", "suite", "site"])
    .describe(
      "Kind of entity to check. 'site' checks every suite of sites whose name matches search.",
    ),
  search: z
    .string()
    .optional()
    .describe("Only entities matching this name/number/title. Omit for all."),
  staff: z
    .enum(["internal", "external"])
    .optional()
    .describe("Staff type only: internal or external. Omit for both."),
  site: z
    .string()
    .optional()
    .describe("Suites only: limit to suites whose site name contains this."),
  status: z
    .enum(["active", "inactive", "all"])
    .optional()
    .describe("Entity status. Default active."),
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
      "Window ends this many days after start, inclusive (alternative to 'to'). Default 14.",
    ),
  weeks: z
    .number()
    .int()
    .min(1)
    .max(13)
    .optional()
    .describe("Window length in weeks (overrides 'days')."),
  duration: z
    .number()
    .int()
    .min(1)
    .max(132480)
    .optional()
    .describe("Required free length. Needs duration_unit."),
  duration_unit: z
    .enum(["minutes", "hours", "days"])
    .optional()
    .describe(
      "'minutes'/'hours' need one contiguous free slot of that length; 'days' needs that many fully-free days.",
    ),
});

type Args = z.infer<typeof schema>;

interface Slot {
  start: string;
  end: string;
  minutes: number;
}

interface Booking {
  start: string;
  end: string;
  name?: string | null;
  project?: string | null;
  optional: boolean;
}

interface Entity {
  name: string;
  kind: string;
  site?: string | null;
  available: boolean;
  free_days: number;
  free_slots: Slot[];
  bookings: Booking[];
}

interface Response {
  from: string;
  to: string;
  timezone: string;
  duration?: number;
  duration_unit?: string;
  truncated?: boolean;
  entities: Entity[];
}

const SLOT_CAP = 20;
const BOOKING_CAP = 10;

export class GetAvailabilityTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    if (!args?.type) throw new Error("type is required.");

    // API accepts only minutes/days; hours are converted here.
    let duration = args.duration;
    let unit = args.duration_unit;
    if (unit === "hours" && typeof duration === "number") {
      duration *= 60;
      unit = "minutes";
    }

    const p = new URLSearchParams();
    p.append("type", args.type);
    if (args.search?.trim()) p.append("search", args.search.trim());
    if (args.staff === "internal") p.append("internal-only", "true");
    if (args.staff === "external") p.append("external-only", "true");
    if (args.site?.trim()) p.append("site", args.site.trim());
    if (args.status) p.append("status", args.status);
    if (args.from) p.append("from", args.from);
    if (args.to) p.append("to", args.to);
    if (typeof args.days === "number") p.append("days", String(args.days));
    if (typeof args.weeks === "number") p.append("weeks", String(args.weeks));
    if (typeof duration === "number") p.append("duration", String(duration));
    if (unit) p.append("duration-unit", unit);

    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-availability?${p.toString()}`,
    );

    let text = `Availability (${args.type}) ${data.from} to ${data.to}, timezone ${data.timezone}`;
    if (data.duration) {
      text += `, requested: ${data.duration} ${data.duration_unit} free`;
    }
    text += `\n\n`;

    if (data.entities.length === 0) {
      text += `No matching entities. Try find_resources to check the names, or status="all".\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    for (const e of data.entities) {
      text += `${e.name}${e.site ? ` (${e.site})` : ""}: ${e.available ? "AVAILABLE" : "not available"}, ${plural(e.free_days, "fully-free day")}\n`;
      if (e.free_slots.length > 0) {
        text += `  Free slots:\n`;
        for (const s of e.free_slots.slice(0, SLOT_CAP)) {
          text += `  - ${dateTime(s.start)} to ${dateTime(s.end)} (${s.minutes} min)\n`;
        }
        if (e.free_slots.length > SLOT_CAP) {
          text += `  - … ${e.free_slots.length - SLOT_CAP} more slots\n`;
        }
      }
      if (e.bookings.length > 0) {
        text += `  Booked:\n`;
        for (const b of e.bookings.slice(0, BOOKING_CAP)) {
          text += `  - ${dateTime(b.start)} to ${dateTime(b.end)}${b.name ? ` (${b.name})` : ""}${b.project ? ` · project ${b.project}` : ""}${b.optional ? " [optional]" : ""}\n`;
        }
        if (e.bookings.length > BOOKING_CAP) {
          text += `  - … ${e.bookings.length - BOOKING_CAP} more bookings\n`;
        }
      }
    }

    if (data.truncated) {
      text += `\nNote: only the first 100 matching entities were evaluated — narrow with search.\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
