import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { DATE_REGEX, money, plural } from "../utils/format.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_invoices";
const TOOL_DESCRIPTION =
  "List invoices with filters and per-currency totals; paginated. " +
  "Status buckets: draft, open (finalized & unpaid, includes overdue), overdue, paid, partially-paid, canceled, locked. " +
  "To find a client's invoices use search — it matches number, order number, subject and recipient address.";

const schema = z.object({
  search: z
    .string()
    .optional()
    .describe("Match number, order number, subject or recipient address."),
  status: z
    .enum([
      "all",
      "draft",
      "open",
      "overdue",
      "paid",
      "partially-paid",
      "canceled",
      "locked",
    ])
    .optional()
    .describe("Status bucket. Default all."),
  number: z
    .string()
    .optional()
    .describe("Substring match on the invoice number."),
  date_min: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Invoice date from, YYYY-MM-DD."),
  date_max: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Invoice date to, YYYY-MM-DD."),
  due_date_min: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Payment due date from, YYYY-MM-DD."),
  due_date_max: z
    .string()
    .regex(DATE_REGEX, "Use YYYY-MM-DD")
    .optional()
    .describe("Payment due date to, YYYY-MM-DD."),
  sum_min: z
    .number()
    .optional()
    .describe("Minimum net total in major currency units (e.g. euros)."),
  sum_max: z.number().optional().describe("Maximum net total, major units."),
  outstanding_min: z
    .number()
    .optional()
    .describe("Minimum outstanding balance, major units."),
  outstanding_max: z
    .number()
    .optional()
    .describe("Maximum outstanding balance, major units."),
  sort: z
    .enum([
      "date",
      "number",
      "due_date",
      "payment_due_at",
      "total_sum_net",
      "total_outstanding_balance",
      "paid_at",
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

interface Invoice {
  number?: string | null;
  subject: string;
  payment_due_at?: string | null;
  currency: string;
  status: string;
  total_net_cents: number;
  outstanding_cents: number;
  outstanding_percentage: number;
  client?: Ref | null;
  order?: Ref | null;
}

interface Stat {
  currency: string;
  total_net_cents: number;
  total_outstanding_cents: number;
}

interface Meta {
  page: number;
  rows: number;
  pages: number;
}

interface Response {
  meta: Meta;
  stats: Stat[];
  invoices: Invoice[];
}

export class GetInvoicesTool extends BaseTool {
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
    if (a.due_date_min) p.append("due-date-min", a.due_date_min);
    if (a.due_date_max) p.append("due-date-max", a.due_date_max);
    // The API takes whole major units (i64) — round fractional amounts.
    if (typeof a.sum_min === "number")
      p.append("sum-min", String(Math.round(a.sum_min)));
    if (typeof a.sum_max === "number")
      p.append("sum-max", String(Math.round(a.sum_max)));
    if (typeof a.outstanding_min === "number")
      p.append("outstanding-min", String(Math.round(a.outstanding_min)));
    if (typeof a.outstanding_max === "number")
      p.append("outstanding-max", String(Math.round(a.outstanding_max)));
    if (a.sort) p.append("sort", a.sort);
    if (a.order) p.append("order", a.order);
    if (typeof a.page === "number") p.append("page", String(a.page));
    if (typeof a.per_page === "number")
      p.append("per-page", String(a.per_page));

    const query = p.toString();
    const { data } = await freispaceClient.get<Response>(
      `/tools/analytics/get-invoices${query ? `?${query}` : ""}`,
    );

    let text = `${plural(data.meta.rows, "invoice")} (page ${data.meta.page}/${Math.max(data.meta.pages, 1)})\n`;
    if (data.stats.length > 0) {
      text += `Totals: ${data.stats
        .map(
          (s) =>
            `${money(s.total_net_cents, s.currency)} net, ${money(s.total_outstanding_cents, s.currency)} outstanding`,
        )
        .join("; ")}\n`;
    }
    text += `\n`;

    if (data.invoices.length === 0) {
      text += `No matching invoices. Try fewer filters or status="all".\n`;
      return { content: [{ type: "text" as const, text }] };
    }

    for (const inv of data.invoices) {
      const out =
        inv.outstanding_cents > 0
          ? `, ${money(inv.outstanding_cents, inv.currency)} outstanding (${inv.outstanding_percentage}%)`
          : "";
      const due = inv.payment_due_at ? `, due ${inv.payment_due_at}` : "";
      text += `- ${inv.number ?? "(no number)"} [${inv.status}] ${money(inv.total_net_cents, inv.currency)} net${out}${due}\n`;
      text += `  ${inv.subject}${inv.client?.name ? ` · ${inv.client.name}` : ""}${inv.order?.name ? ` · order ${inv.order.name}` : ""}\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
}
