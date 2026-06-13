import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staffs";
const TOOL_DESCRIPTION =
  "List staff members with name, title and staff number. Default: active staff only. " +
  "Use it to browse the team or to find the exact staff name for other tools.";

const schema = z.object({
  status: z
    .enum(["active", "inactive", "all"])
    .optional()
    .describe("Staff status. Default active."),
});

type Args = z.infer<typeof schema>;

interface StaffItem {
  display_name: string;
  title?: string | null;
  number?: string | null;
  internal: boolean;
}

interface Response {
  staffs: { amount: number; items: StaffItem[] };
}

export class GetStaffsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    const status = args?.status ?? "active";
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/find-resources?status=${status}`,
    );

    const staffs = data.staffs?.items ?? [];
    if (staffs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No ${status === "all" ? "" : `${status} `}staff members found. Try status="all".`,
          },
        ],
      };
    }

    const label = status === "all" ? "staff member" : `${status} staff member`;
    let text = `${plural(data.staffs.amount, label)}:\n`;
    for (const s of staffs) {
      text += `- ${s.display_name}`;
      if (s.title) text += ` — ${s.title}`;
      if (s.number?.trim()) text += ` (#${s.number})`;
      if (!s.internal) text += ` [external]`;
      text += `\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
