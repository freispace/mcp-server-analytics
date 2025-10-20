import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_project_status";
const TOOL_DESCRIPTION = `
Use this tool to retrieve comprehensive project status analytics and statistics. This tool provides detailed information about a specific project's performance and booking status, including:

- Project details (name, number, byline, description)
- Historical booking statistics (past bookings with status breakdown)
- Future booking projections (upcoming bookings with status distribution)
- Percentage-based analysis of project activity

This is useful when you need to:
- Analyze project performance and activity levels
- Understand booking patterns and project status distribution
- Get insights into project workload and resource allocation
- Track project progress through booking status analysis
- Generate project reports and status summaries

Provide the project name as input to get comprehensive project analytics and status information.
`;

const getProjectStatsSchema = z.object({
  name: z
    .string()
    .describe("The name of the project to query status analytics for"),
});

export class GetProjectStatsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getProjectStatsSchema;

  async execute(args?: z.infer<typeof getProjectStatsSchema>) {
    try {
      if (!args?.name) {
        throw new Error("Project name is required");
      }

      const endpoint = `/tools/analytics/get-project-stats?name=${encodeURIComponent(args.name)}`;

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Project Status Report for ${data.project?.name || args.name}\n\n`;

      if (data.project) {
        formattedText += `**Project Details:**\n`;
        formattedText += `- Name: ${data.project.name}\n`;
        formattedText += `- Number: ${data.project.number || "N/A"}\n`;
        formattedText += `- Byline: ${data.project.byline || "N/A"}\n`;
        if (data.project.description) {
          formattedText += `- Description: ${data.project.description}\n`;
        }
        formattedText += `\n`;
      }

      if (data.bookings_past) {
        formattedText += `**Past Bookings:**\n`;
        formattedText += `- Total: ${data.bookings_past.number}\n`;
        formattedText += `- Percentage: ${data.bookings_past.percentage}%\n`;

        if (
          data.bookings_past.by_status &&
          Object.keys(data.bookings_past.by_status).length > 0
        ) {
          formattedText += `- Status Breakdown:\n`;
          Object.entries(data.bookings_past.by_status).forEach(
            ([status, count]) => {
              formattedText += `  - ${status}: ${count}\n`;
            },
          );
        } else {
          formattedText += `- Status Breakdown: No past bookings\n`;
        }
        formattedText += `\n`;
      }

      if (data.bookings_future) {
        formattedText += `**Future Bookings:**\n`;
        formattedText += `- Total: ${data.bookings_future.number}\n`;
        formattedText += `- Percentage: ${data.bookings_future.percentage}%\n`;

        if (
          data.bookings_future.by_status &&
          Object.keys(data.bookings_future.by_status).length > 0
        ) {
          formattedText += `- Status Breakdown:\n`;
          Object.entries(data.bookings_future.by_status).forEach(
            ([status, count]) => {
              formattedText += `  - ${status}: ${count}\n`;
            },
          );
        } else {
          formattedText += `- Status Breakdown: No future bookings\n`;
        }
        formattedText += `\n`;
      }

      const totalBookings =
        (data.bookings_past?.number || 0) + (data.bookings_future?.number || 0);
      if (totalBookings > 0) {
        formattedText += `**Summary:**\n`;
        formattedText += `- Total Bookings: ${totalBookings}\n`;
        formattedText += `- Past Activity: ${data.bookings_past?.percentage || 0}%\n`;
        formattedText += `- Future Activity: ${data.bookings_future?.percentage || 0}%\n`;
      }

      return {
        content: [
          {
            type: "text" as const,
            text: formattedText,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing get project status tool", error);
      throw error;
    }
  }
}
