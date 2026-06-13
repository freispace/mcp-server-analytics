import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { DATE_REGEX, money, plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_offers";
const TOOL_DESCRIPTION =
  "List offers (quotes) with filters and per-currency net totals; paginated. " +
  "Status buckets: draft, locked, open (finalized, no decision yet), accepted, declined. " +
  "Each offer shows how many invoices were created from it. " +
  "Search matches number, order number, subject and recipient address.";

const schema = z.object({
  search: z
    .string()
    .optional()
    .describe("Match number, order number, subject or recipient address."),
  status: z
    .enum(["all", "draft", "locked", "open", "accepted", "declined"])
    .optional()
    .describe("Status bucket. Default all."),
  number: z
    .string()
    .optional()
    .describe("Substring match on the offer number."),
  date_min: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Offer date from, YYYY-MM-DD."),
  date_max: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Offer date to, YYYY-MM-DD."),
  sum_min: z
    .number()
    .optional()
    .describe("Minimum net total in major currency units (e.g. euros)."),
  sum_max: z.number().optional().describe("Maximum net total, major units."),
  sort: z
    .enum([
      "date",
      "number",
      "total_sum_net",
      "offer_valid_until",
      "status",
      "created_at",
    ])
    .optional()
    .describe("Sort column. Default date."),
  order: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction. Default desc."),
  page: z
    .number()
    .int()
    .min(1)
    .max(999)
    .optional()
    .describe("Page number. Default 1."),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page. Default 25."),
});

type Args = z.infer<typeof schema>;

interface Ref {
  name?: string | null;
}

interface Offer {
  number?: string | null;
  subject: string;
  offer_valid_until?: string | null;
  currency: string;
  status: string;
  total_net_cents: number;
  invoice_count: number;
  client?: Ref | null;
  order?: Ref | null;
}

interface Stat {
  currency: string;
  total_net_cents: number;
}

interface Meta {
  page: number;
  rows: number;
  pages: number;
}

interface Response {
  meta: Meta;
  stats: Stat[];
  offers: Offer[];
}

export class GetOffersTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = schema;

  async execute(args?: Args) {
    const p = new URLSearchParams();
    const a = args ?? {};
    if (a.search?.trim()) p.append("search", a.search.trim());
    if (a.status) p.append("status", a.status);
    if (a.number?.trim()) p.append("number", a.number.trim());
    if (a.date_min) p.append("date-min", a.date_min);
    if (a.date_max) p.append("date-max", a.date_max);
    // The API takes whole major units (i64) — round fractional amounts.
    if (typeof a.sum_min === "number")
      p.append("sum-min", String(Math.round(a.sum_min)));
    if (typeof a.sum_max === "number")
      p.append("sum-max", String(Math.round(a.sum_max)));
    if (a.sort) p.append("sort", a.sort);
    if (a.order) p.append("order", a.order);
    if (typeof a.page === "number") p.append("page", String(a.page));
    if (typeof a.per_page === "number")
      p.append("per-page", String(a.per_page));

    const query = p.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-offers${query ? `?${query}` : ""}`,
    );

    let text = `${plural(data.meta.rows, "offer")} (page ${data.meta.page}/${Math.max(data.meta.pages, 1)})\n`;
    if (data.stats.length > 0) {
      text += `Totals: ${data.stats
        .map((s) => `${money(s.total_net_cents, s.currency)} net`)
        .join("; ")}\n`;
    }
    text += `\n`;

    if (data.offers.length === 0) {
      text += `No matching offers. Try fewer filters or status="all".\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    for (const o of data.offers) {
      const valid = o.offer_valid_until
        ? `, valid until ${o.offer_valid_until}`
        : "";
      const inv =
        o.invoice_count > 0 ? `, ${plural(o.invoice_count, "invoice")}` : "";
      text += `- ${o.number ?? "(no number)"} [${o.status}] ${money(o.total_net_cents, o.currency)} net${valid}${inv}\n`;
      text += `  ${o.subject}${o.client?.name ? ` · ${o.client.name}` : ""}${o.order?.name ? ` · order ${o.order.name}` : ""}\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
