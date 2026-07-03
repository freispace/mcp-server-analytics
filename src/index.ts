#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FindResourcesTool } from "./tools/find-resources.js";
import { GetAvailabilityTool } from "./tools/get-availability.js";
import { GetCurrentUserTool } from "./tools/get-current-user.js";
import { GetInvoicesTool } from "./tools/get-invoices.js";
import { GetMyScheduleTool } from "./tools/get-my-schedule.js";
import { GetMyTasksTool } from "./tools/get-my-tasks.js";
import { GetOffersTool } from "./tools/get-offers.js";
import { GetOpenTasksTool } from "./tools/get-open-tasks.js";
import { GetOrdersTool } from "./tools/get-orders.js";
import { GetProjectStatsTool } from "./tools/get-project-stats.js";
import { GetProjectTasksTool } from "./tools/get-project-tasks.js";
import { GetProjectTeamTool } from "./tools/get-project-team.js";
import { GetStaffCollaboratorsTool } from "./tools/get-staff-collaborators.js";
import { GetStaffHolidayQuotaTool } from "./tools/get-staff-holiday-quota.js";
import { GetStaffNextHolidayTool } from "./tools/get-staff-next-holiday.js";
import { GetStaffProjectsTool } from "./tools/get-staff-projects.js";
import { GetStaffsTool } from "./tools/get-staffs.js";
import { SearchDocsTool } from "./tools/search-docs.js";

// Single source of truth for the version is package.json.
const VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const server = new McpServer({
  name: "freispace",
  version: VERSION,
});

new GetCurrentUserTool().register(server);
new GetStaffsTool().register(server);
new FindResourcesTool().register(server);
new GetAvailabilityTool().register(server);
new GetMyScheduleTool().register(server);
new GetMyTasksTool().register(server);
new GetOpenTasksTool().register(server);
new GetStaffProjectsTool().register(server);
new GetStaffCollaboratorsTool().register(server);
new GetStaffNextHolidayTool().register(server);
new GetStaffHolidayQuotaTool().register(server);
new GetProjectStatsTool().register(server);
new GetProjectTeamTool().register(server);
new GetProjectTasksTool().register(server);
new GetInvoicesTool().register(server);
new GetOffersTool().register(server);
new GetOrdersTool().register(server);
new SearchDocsTool().register(server);

// Diagnostics go to stderr only — stdout carries the MCP protocol.
const log = (...args: unknown[]) => console.error(...args);

async function runServer() {
  const transport = new StdioServerTransport();

  let isShuttingDown = false;

  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
      transport.close();
    } catch (error) {
      log("Error closing transport:", error);
    }
    process.exit(0);
  };

  transport.onerror = (error: Error) => {
    log("Transport error:", error);
    cleanup();
  };

  transport.onclose = cleanup;

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
  process.on("beforeExit", cleanup);

  await server.connect(transport);
  log(`freispace MCP server v${VERSION} started (PID: ${process.pid})`);
}

runServer().catch((error) => {
  log("Fatal error running server:", error);
  if (!process.exitCode) {
    process.exit(1);
  }
});
