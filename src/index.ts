#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GetEntitiesByNameTool } from "./tools/get-entities-by-name.js";
import { GetProjectStatsTool } from "./tools/get-project-stats.js";
import { GetStaffProjectsTool } from "./tools/get-staff-projects.js";
import { GetStaffsTool } from "./tools/get-staffs.js";
import { GetStaffsLeftHolidaysTool } from "./tools/get-staffs-left-holidays.js";
import { GetStaffsNextHolidaysTool } from "./tools/get-staffs-next-holidays.js";
import { GetStaffsWorkedOnProjectTool } from "./tools/get-staffs-worked-on-project.js";
import { GetStaffsWorkedTogetherTool } from "./tools/get-staffs-worked-together.js";
import { setupJsonConsole } from "./utils/console.js";

setupJsonConsole();

const VERSION = "1.0.0";
const server = new McpServer({
  name: "freispace",
  version: VERSION,
});

new GetStaffsTool().register(server);
new GetStaffsWorkedTogetherTool().register(server);
new GetStaffsNextHolidaysTool().register(server);
new GetStaffsLeftHolidaysTool().register(server);
new GetProjectStatsTool().register(server);
new GetStaffProjectsTool().register(server);
new GetEntitiesByNameTool().register(server);
new GetStaffsWorkedOnProjectTool().register(server);

async function runServer() {
  const transport = new StdioServerTransport();
  console.log(`Starting server v${VERSION} (PID: ${process.pid})`);

  let isShuttingDown = false;

  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Shutting down server (PID: ${process.pid})...`);
    try {
      transport.close();
    } catch (error) {
      console.error(`Error closing transport (PID: ${process.pid}):`, error);
    }
    console.log(`Server closed (PID: ${process.pid})`);
    process.exit(0);
  };

  transport.onerror = (error: Error) => {
    console.error(`Transport error (PID: ${process.pid}):`, error);
    cleanup();
  };

  transport.onclose = () => {
    console.log(`Transport closed unexpectedly (PID: ${process.pid})`);
    cleanup();
  };

  process.on("SIGTERM", () => {
    console.log(`Received SIGTERM (PID: ${process.pid})`);
    cleanup();
  });

  process.on("SIGINT", () => {
    console.log(`Received SIGINT (PID: ${process.pid})`);
    cleanup();
  });

  process.on("beforeExit", () => {
    console.log(`Received beforeExit (PID: ${process.pid})`);
    cleanup();
  });

  await server.connect(transport);
  console.log(`Server started (PID: ${process.pid})`);
}

runServer().catch((error) => {
  console.error(`Fatal error running server (PID: ${process.pid}):`, error);
  if (!process.exitCode) {
    process.exit(1);
  }
});
