import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { DATE_REGEX, money, plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_orders";
const TOOL_DESCRIPTION =
  "List orders (jobs) with their connected offers and invoices inline; paginated. " +
  "Use it for questions like 'what was quoted and billed on order X'. " +
  "Search matches order number and name.";

const schema = z.object({
  search: z.string().optional().describe("Match order number or name."),
  status: z
    .enum(["all", "active", "inactive"])
    .optional()
    .describe("Order status. Default all."),
  number: z
    .string()
    .optional()
    .describe("Substring match on the order number."),
  date_min: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Created from, YYYY-MM-DD."),
  date_max: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Created to, YYYY-MM-DD."),
  sort: z
    .enum(["number", "created_at"])
    .optional()
    .describe("Sort column. Default number."),
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

interface ConnInvoice {
  number?: string | null;
  status: string;
  currency: string;
  total_net_cents: number;
  outstanding_cents: number;
}

interface ConnOffer {
  number?: string | null;
  subject: string;
  status: string;
  currency: string;
  total_net_cents: number;
}

interface Order {
  number: string;
  name?: string | null;
  status: string;
  client?: Ref | null;
  project?: Ref | null;
  counts: { offers: number; invoices: number; bookings: number };
  offers: ConnOffer[];
  invoices: ConnInvoice[];
}

interface Meta {
  page: number;
  rows: number;
  pages: number;
}

interface Response {
  meta: Meta;
  orders: Order[];
}

const DOC_CAP = 10;

export class GetOrdersTool extends BaseTool {
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
    if (a.sort) p.append("sort", a.sort);
    if (a.order) p.append("order", a.order);
    if (typeof a.page === "number") p.append("page", String(a.page));
    if (typeof a.per_page === "number")
      p.append("per-page", String(a.per_page));

    const query = p.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-orders${query ? `?${query}` : ""}`,
    );

    let text = `${plural(data.meta.rows, "order")} (page ${data.meta.page}/${Math.max(data.meta.pages, 1)})\n\n`;

    if (data.orders.length === 0) {
      text += `No matching orders. Try fewer filters or status="all".\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    for (const o of data.orders) {
      text += `${o.number}${o.name ? ` — ${o.name}` : ""} [${o.status}]`;
      const meta: string[] = [];
      if (o.client?.name) meta.push(`client ${o.client.name}`);
      if (o.project?.name) meta.push(`project ${o.project.name}`);
      if (meta.length > 0) text += ` · ${meta.join(" · ")}`;
      text += `\n`;
      text += `  ${o.counts.offers} offers, ${o.counts.invoices} invoices, ${o.counts.bookings} bookings\n`;

      for (const x of o.offers.slice(0, DOC_CAP)) {
        text += `  - offer ${x.number ?? "(no number)"} [${x.status}] ${money(x.total_net_cents, x.currency)} net — ${x.subject}\n`;
      }
      if (o.offers.length > DOC_CAP) {
        text += `  - … ${o.offers.length - DOC_CAP} more offers\n`;
      }
      for (const x of o.invoices.slice(0, DOC_CAP)) {
        const out =
          x.outstanding_cents > 0
            ? `, ${money(x.outstanding_cents, x.currency)} outstanding`
            : "";
        text += `  - invoice ${x.number ?? "(no number)"} [${x.status}] ${money(x.total_net_cents, x.currency)} net${out}\n`;
      }
      if (o.invoices.length > DOC_CAP) {
        text += `  - … ${o.invoices.length - DOC_CAP} more invoices\n`;
      }
      text += `\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
