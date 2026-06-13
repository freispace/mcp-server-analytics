import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "find_resources";
const TOOL_DESCRIPTION =
  "Search rooms/studios (suites), equipment/licenses (resources) and staff by name in one call; results are grouped by type. " +
  "Call without search to list everything. " +
  "Use it to find entities and the exact names to pass to other tools.";

const schema = z.object({
  search: z
    .string()
    .optional()
    .describe(
      "Name or partial name. Multiple words: every word must match. Omit to list everything.",
    ),
  staff: z
    .enum(["internal", "external"])
    .optional()
    .describe("Only internal or only external staff. Omit for both."),
  site: z
    .string()
    .optional()
    .describe("Only suites whose site name contains this text."),
  status: z
    .enum(["active", "inactive", "all"])
    .optional()
    .describe("Entity status. Default active."),
});

type Args = z.infer<typeof schema>;

interface Section<T> {
  amount: number;
  items: T[];
}

interface SuiteItem {
  name: string;
  byline?: string | null;
  number?: string | null;
  site?: string | null;
}

interface ResourceItem {
  name: string;
  byline?: string | null;
  number?: string | null;
}

interface StaffItem {
  display_name: string;
  title?: string | null;
  number?: string | null;
  internal: boolean;
}

interface Response {
  suites: Section<SuiteItem>;
  resources: Section<ResourceItem>;
  staffs: Section<StaffItem>;
}

const ITEM_CAP = 50;

export class FindResourcesTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    const search = args?.search?.trim() ?? "";

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (args?.staff === "internal") params.append("internal-only", "true");
    if (args?.staff === "external") params.append("external-only", "true");
    if (args?.site?.trim()) params.append("site", args.site.trim());
    if (args?.status) params.append("status", args.status);

    const query = params.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/find-resources${query ? `?${query}` : ""}`,
    );

    const total =
      data.suites.amount + data.resources.amount + data.staffs.amount;

    if (total === 0) {
      const text = search
        ? `No suites, resources or staff match "${search}". Try a shorter term or fewer filters (e.g. status="all"), or call find_resources without search to list everything.`
        : `No suites, resources or staff found.`;
      return { content: [{ type: "text" as const, text }] };
    }

    const line = (
      name: string,
      title?: string | null,
      number?: string | null,
      extra?: string,
    ) => {
      let out = `- ${name}`;
      if (title) out += ` — ${title}`;
      if (number?.trim()) out += ` (#${number})`;
      if (extra) out += ` [${extra}]`;
      return `${out}\n`;
    };

    const cap = <T>(s: Section<T>) =>
      s.items.length > ITEM_CAP
        ? `  … ${s.items.length - ITEM_CAP} more\n`
        : "";

    let text = search
      ? `${plural(total, "match")} for "${search}":\n\n`
      : `${total} entit${total === 1 ? "y" : "ies"}:\n\n`;

    if (data.suites.amount > 0) {
      text += `Suites (${data.suites.amount}):\n`;
      for (const s of data.suites.items.slice(0, ITEM_CAP)) {
        text += line(s.name, s.byline, s.number, s.site ?? undefined);
      }
      text += cap(data.suites);
    }
    if (data.resources.amount > 0) {
      text += `Resources (${data.resources.amount}):\n`;
      for (const r of data.resources.items.slice(0, ITEM_CAP)) {
        text += line(r.name, r.byline, r.number);
      }
      text += cap(data.resources);
    }
    if (data.staffs.amount > 0) {
      text += `Staff (${data.staffs.amount}):\n`;
      for (const st of data.staffs.items.slice(0, ITEM_CAP)) {
        text += line(
          st.display_name,
          st.title,
          st.number,
          st.internal ? undefined : "external",
        );
      }
      text += cap(data.staffs);
    } else if (args?.staff) {
      text += `Staff (0): no ${args.staff} staff match.\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
