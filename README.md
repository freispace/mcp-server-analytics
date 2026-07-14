# freispace MCP Server

A Model Context Protocol (MCP) server that provides analytics and insights for the [scheduling software freispace](https://freispace.com). This server enables AI assistants (e.g. Copilot, Gemini) to query data within freispace, such as project statistics and planning related information.

## Overview

The freispace MCP Server connects any LLM with tooling capabilities to [freispace](https://freispace.com) to query analytical data.

Media teams using freispace can leverage the MCP server to make planning data available to the entire company using the company-wide AI (e.g. Copilot), without users having to be on freispace or even know about freispace, as well as help post-production teams make data-driven decisions while scheduling and planning.

Our MCP Server always respects user permissions, ensuring that the LLM will only be able to access data on a per-user level, ensuring data safety.

Example queries might be "Who worked with Person X in the past" or "How many vacation days do I have left?"

## Prerequisites

1. [freispace Flagship](https://freispace.com/pricing) account
2. Valid MCP API key for freispace
    - During `beta`, contact your freispace support team to obtain an MCP API key

## Available Tools

All lookups are name-based. Partial names match; the first match is used.

### `get_current_user`

Who the calling user is: name, email and linked staff record. No arguments. Use it to resolve "I"/"me"/"my" to a staff name.

> "Who am I logged in as?"

### `get_staffs`

List staff members with name, title and staff number.

- `status` (optional): `active` (default), `inactive`, `all`

> "List all staff members" · "Who are the developers in the company?"

### `find_resources`

Search rooms/studios (suites), equipment/licenses (resources) and staff by name in one call, grouped by type.

- `search` (optional): name or partial name; omit to list everything
- `staff` (optional): `internal` or `external`
- `site` (optional): only suites at matching sites
- `status` (optional): `active` (default), `inactive`, `all`

> "Find Sammy" · "List external freelancers"

### `get_availability`

Check when staff, suites or resources are free in a date window (default 14 days, max 92), considering bookings, public holidays and staff absences/work times.

- `type` (required): `staff`, `resource`, `suite` or `site`
- `search`, `staff`, `site`, `status` (optional): entity selection as in `find_resources`
- `from`, `to`, `days`, `weeks` (optional): the date window
- `duration` + `duration_unit` (optional): required free length (`minutes`, `hours` or `days`)

> "Is a studio free next Tuesday for 3 hours?" · "Who has 2 fully-free days in the next two weeks?"

### `get_my_schedule`

The calling user's own bookings in a date window (default: next 7 days).

- `from`, `to`, `days`, `weeks` (optional): the date window

> "What's on my schedule this week?"

### `get_my_tasks`

Tasks assigned to the calling user, with due date, priority and reference.

- `include_done` (optional): also include completed tasks

> "What are my open tasks?"

### `get_open_tasks`

All open tasks of the team, with assignees.

- `reference` (optional): `project`, `booking` or `user`

> "Which project tasks are still open?"

### `get_staff_projects`

List the projects a staff member is booked on, with date range and duration.

- `staff_name` (required)

> "What projects is Karl booked on?"

### `get_staff_collaborators`

Show who a staff member has worked with, based on shared bookings.

- `staff_name` (required)

> "Who has Alexander worked with?"

### `get_staff_next_holiday`

Get a staff member's next upcoming holiday (start, end, length, comment).

- `staff_name` (optional; omit for the calling user)

> "When is my next holiday?" · "When is Hendrikje on holiday?"

### `get_staff_holiday_quota`

Get a staff member's holiday quota for one year: total, taken and remaining days.

- `staff_name` (optional; omit for the calling user)
- `year` (optional; defaults to the current year)

> "How many vacation days do I have left?"

### `get_project_stats`

Booking statistics for one project: past vs upcoming bookings with per-status breakdown, plus the project timespan (first booking start, last booking end and the duration in days between them).

- `project_name` (required)

> "Show booking stats for Project Alpha" · "How long does Project Alpha run?"

### `get_project_team`

List the staff members who worked on a project, with their number of bookings on it.

- `project_name` (required)

> "Who worked on the website redesign?"

### `get_project_tasks`

Task status of one project: all tasks on the project and its bookings, with an open/done/overdue summary.

- `project_name` (required)

> "Are there open tasks on the documentary project?"

### `get_invoices`

List invoices with filters and per-currency totals; paginated. Status buckets: `draft`, `open`, `overdue`, `paid`, `partially-paid`, `canceled`, `locked`.

- `search` (optional): matches number, order number, subject, recipient address
- `status`, `number`, `date_min`/`date_max`, `due_date_min`/`due_date_max`, `sum_min`/`sum_max`, `outstanding_min`/`outstanding_max`, `sort`, `order`, `page`, `per_page` (optional)

> "Which invoices are overdue?" · "Open invoices for Acme"

### `get_offers`

List offers (quotes) with filters and per-currency net totals; paginated. Status buckets: `draft`, `locked`, `open`, `accepted`, `declined`.

- `search`, `status`, `number`, `date_min`/`date_max`, `sum_min`/`sum_max`, `sort`, `order`, `page`, `per_page` (optional)

> "Show declined offers from this year"

### `get_orders`

List orders (jobs) with their connected offers and invoices inline; paginated.

- `search` (optional): matches order number and name
- `status`, `number`, `date_min`/`date_max`, `sort`, `order`, `page`, `per_page` (optional)

> "What was quoted and billed on order 2026-014?"

### `search_docs`

Search the freispace documentation and return the most relevant excerpts.

- `query` (required)
- `limit` (optional): max excerpts, default 5

> "How do I set up shift planning in freispace?"

## Error Handling

Errors are returned to the calling model as short, actionable messages (e.g. `Not found (404): Staff member with name 'X' not found. Call get_staffs to list valid staff names.`). Diagnostics are logged to stderr; stdout carries only the MCP protocol.

## ⚠️ Beta Notice

Our freispace MCP server is currently in beta. All features are free during this period. We appreciate your feedback and patience as we continue to improve the platform.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- **Documentation**: [freispace documentation](https://docs.freispace.com)
- **Issues**: [GitHub Issues](https://github.com/freispace/mcp-server-analytics/issues)
- **Contact**: [freispace Support](https://freispace.com/support)
