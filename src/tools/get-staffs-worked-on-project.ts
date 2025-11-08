import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staffs_worked_on_project";
const TOOL_DESCRIPTION = `
Use this tool to retrieve a comprehensive list of all staff members who have worked on a specific project. This tool provides detailed information about project participation and staff involvement, including:

- Complete list of staff members assigned to the project
- Individual staff details (name, title, role)
- Number of bookings each staff member had on the project
- Project team composition and workload distribution

This is useful when you need to:
- Identify all team members who worked on a specific project
- Analyze project team composition and roles
- Understand staff workload distribution across projects
- Generate project team reports and summaries
- Track project participation and involvement
- Assess team performance and resource allocation

Provide the project name as input to get a complete list of all staff members who have been involved with that project through bookings and assignments.
`;

const getStaffsWorkedOnProjectSchema = z.object({
  name: z
    .string()
    .describe(
      "The name of the project to query for staff members who worked on it",
    ),
});

export class GetStaffsWorkedOnProjectTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getStaffsWorkedOnProjectSchema;

  async execute(args?: z.infer<typeof getStaffsWorkedOnProjectSchema>) {
    try {
      if (!args?.name) {
        throw new Error("Project name is required");
      }

      const endpoint = `/tools/analytics/get-staffs-worked-on-project?name=${encodeURIComponent(args.name)}`;

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Project Team for "${args.name}"\n\n`;

      if (data.staffs && Array.isArray(data.staffs) && data.staffs.length > 0) {
        formattedText += `**Total Team Members: ${data.amount_staffs}**\n\n`;
        formattedText += `**Team Members:**\n\n`;

        data.staffs.forEach((staff: any, index: number) => {
          formattedText += `${index + 1}. **${staff.name}**\n`;
          formattedText += `   - Title: ${staff.title || "N/A"}\n`;
          formattedText += `   - Bookings: ${staff.amount_bookings}\n`;
          formattedText += `\n`;
        });

        const totalBookings = data.staffs.reduce(
          (sum: number, staff: any) => sum + (staff.amount_bookings || 0),
          0,
        );
        const uniqueTitles = [
          ...new Set(data.staffs.map((staff: any) => staff.title)),
        ];

        formattedText += `**Project Summary:**\n`;
        formattedText += `- Total Staff Members: ${data.amount_staffs}\n`;
        formattedText += `- Total Bookings: ${totalBookings}\n`;
        formattedText += `- Unique Roles: ${uniqueTitles.length}\n`;
        formattedText += `- Average Bookings per Staff: ${Math.round(totalBookings / data.amount_staffs)}\n\n`;

        if (uniqueTitles.length > 0) {
          formattedText += `**Role Distribution:**\n`;
          uniqueTitles.forEach((title: any, index: number) => {
            const staffWithTitle = data.staffs.filter(
              (staff: any) => staff.title === title,
            );
            formattedText += `${index + 1}. ${title}: ${staffWithTitle.length} staff member${staffWithTitle.length === 1 ? "" : "s"}\n`;
          });
        }
      } else {
        formattedText += `**No staff members found for this project.**\n\n`;
        if (data.staffs) {
          formattedText += `**Raw Data:**\n\n`;
          formattedText += `\`\`\`json\n${JSON.stringify(data.staffs, null, 2)}\n\`\`\`\n`;
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
      console.error("Error executing get staffs worked on project tool", error);
      throw error;
    }
  }
}
