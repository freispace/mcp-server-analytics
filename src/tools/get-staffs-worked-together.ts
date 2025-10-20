import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "staffs_worked_together_query";
const TOOL_DESCRIPTION = `
Use this tool to find detailed collaboration information for a specific staff member. This tool provides comprehensive data about who a staff member has worked with, including:

- Target staff member details (name, title, role)
- Collaboration summary (total collaborations, unique colleagues, bookings, projects)
- Detailed list of colleagues they've worked with
- Specific bookings/assignments where they collaborated
- Projects they've been involved in together

This is useful when you need to:
- Analyze working relationships and team dynamics
- Find out who a specific person has collaborated with
- Get insights into project participation and booking history
- Understand network connections within the organization

Provide the staff member's name as input to get their complete collaboration profile.
`;

const getStaffWorkedTogetherSchema = z.object({
  name: z
    .string()
    .describe("The name of the staff member to query collaboration data for"),
});

export class GetStaffsWorkedTogetherTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getStaffWorkedTogetherSchema;

  async execute(args?: z.infer<typeof getStaffWorkedTogetherSchema>) {
    try {
      if (!args?.name) {
        throw new Error("Staff name is required");
      }

      const endpoint = `/tools/analytics/get-staffs-worked-together?name=${encodeURIComponent(args.name)}`;

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Collaboration Report for ${data.target_staff?.display_name || args.name}\n\n`;

      if (data.target_staff) {
        formattedText += `**Staff Details:**\n`;
        formattedText += `- Name: ${data.target_staff.display_name}\n`;
        formattedText += `- Title: ${data.target_staff.title}\n`;
        formattedText += `- Number: ${data.target_staff.number || "N/A"}\n\n`;
      }

      if (data.summary) {
        formattedText += `**Collaboration Summary:**\n`;
        formattedText += `- Total Collaborations: ${data.summary.total_collaborations}\n`;
        formattedText += `- Unique Colleagues: ${data.summary.unique_colleagues}\n`;
        formattedText += `- Bookings Involved: ${data.summary.bookings_involved}\n`;
        formattedText += `- Projects Involved: ${data.summary.projects_involved}\n\n`;
      }

      if (data.colleagues && data.colleagues.length > 0) {
        formattedText += `**Colleagues Worked With:**\n`;
        data.colleagues.forEach((colleague: any, index: number) => {
          formattedText += `\n${index + 1}. **${colleague.display_name}** (${colleague.title})\n`;

          if (colleague.bookings && colleague.bookings.length > 0) {
            formattedText += `   Shared Bookings (${colleague.bookings.length}):\n`;
            colleague.bookings.forEach((booking: any) => {
              formattedText += `   - ${booking.name} (${booking.duration})\n`;
            });
          }

          if (colleague.projects && colleague.projects.length > 0) {
            formattedText += `   Shared Projects (${colleague.projects.length}):\n`;
            colleague.projects.forEach((project: any) => {
              formattedText += `   - ${project.name}${project.number ? ` (#${project.number})` : ""}\n`;
            });
          }
        });
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
      console.error("Error executing staffs worked together tool", error);
      throw error;
    }
  }
}
