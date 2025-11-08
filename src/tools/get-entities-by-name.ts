import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_entities_by_name";
const TOOL_DESCRIPTION = `
Use this tool to search for suites, resources, and staff members by name. This tool provides comprehensive entity search functionality across all organizational assets, including:

- Suite search results (rooms, studios, workspaces)
- Resource search results (equipment, licenses, tools)
- Staff search results (employees, team members)
- Availability filtering options (available only, booked only)

This is useful when you need to:
- Find available suites, resources, or staff for new bookings
- Search for specific entities by name or partial name
- Check availability status of organizational assets
- Locate staff members, equipment, or workspaces
- Generate resource availability reports
- Plan resource allocation and scheduling

The tool accepts a required name parameter and optional availability filters to narrow down results based on current booking status.
`;

const getEntitiesByNameSchema = z.object({
  name: z
    .string()
    .describe(
      "The name or partial name to search for across suites, resources, and staff",
    ),
  available_only: z
    .boolean()
    .optional()
    .describe(
      "Filter to show only entities that are currently available (not booked)",
    ),
  booked_only: z
    .boolean()
    .optional()
    .describe(
      "Filter to show only entities that are currently booked (not available)",
    ),
});

export class GetEntitiesByNameTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getEntitiesByNameSchema;

  async execute(args?: z.infer<typeof getEntitiesByNameSchema>) {
    try {
      if (!args?.name) {
        throw new Error("Search name is required");
      }

      const params = new URLSearchParams();
      params.append("name", args.name);

      if (args.available_only) {
        params.append("available-only", "true");
      }

      if (args.booked_only) {
        params.append("booked-only", "true");
      }

      const endpoint = `/tools/analytics/get-entities-by-name?${params.toString()}`;

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Entity Search Results for "${args.name}"\n\n`;

      if (args.available_only || args.booked_only) {
        formattedText += `**Search Filters Applied:**\n`;
        if (args.available_only) {
          formattedText += `- Available Only: Yes (showing unbooked entities)\n`;
        }
        if (args.booked_only) {
          formattedText += `- Booked Only: Yes (showing booked entities)\n`;
        }
        formattedText += `\n`;
      }

      let totalEntities = 0;

      if (data.suites && data.suites.items && data.suites.items.length > 0) {
        formattedText += `## Suites (${data.suites.amount})\n\n`;
        data.suites.items.forEach((suite: any, index: number) => {
          formattedText += `${index + 1}. **${suite.name}**\n`;
          formattedText += `   - ID: ${suite.id}\n`;
          if (suite.number) {
            formattedText += `   - Number: ${suite.number}\n`;
          }
          formattedText += `\n`;
        });
        totalEntities += data.suites.amount;
      }

      if (
        data.resources &&
        data.resources.items &&
        data.resources.items.length > 0
      ) {
        formattedText += `## Resources (${data.resources.amount})\n\n`;
        data.resources.items.forEach((resource: any, index: number) => {
          formattedText += `${index + 1}. **${resource.name}**\n`;
          formattedText += `   - ID: ${resource.id}\n`;
          if (resource.number) {
            formattedText += `   - Number: ${resource.number}\n`;
          }
          formattedText += `\n`;
        });
        totalEntities += data.resources.amount;
      }

      if (data.staffs && data.staffs.items && data.staffs.items.length > 0) {
        formattedText += `## Staff Members (${data.staffs.amount})\n\n`;
        data.staffs.items.forEach((staff: any, index: number) => {
          formattedText += `${index + 1}. **${staff.name}**\n`;
          formattedText += `   - ID: ${staff.id}\n`;
          formattedText += `   - Title: ${staff.title || "N/A"}\n`;
          if (staff.number) {
            formattedText += `   - Number: ${staff.number}\n`;
          }
          formattedText += `\n`;
        });
        totalEntities += data.staffs.amount;
      }

      if (totalEntities > 0) {
        formattedText += `**Search Summary:**\n`;
        formattedText += `- Total Entities Found: ${totalEntities}\n`;
        if (data.suites) formattedText += `- Suites: ${data.suites.amount}\n`;
        if (data.resources)
          formattedText += `- Resources: ${data.resources.amount}\n`;
        if (data.staffs)
          formattedText += `- Staff Members: ${data.staffs.amount}\n`;
      } else {
        formattedText += `**No entities found matching "${args.name}"**\n`;
        if (args.available_only || args.booked_only) {
          formattedText += `Try removing the availability filters to see all matching entities.\n`;
        }
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
      console.error("Error executing get entities by name tool", error);
      throw error;
    }
  }
}
