import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_staff_projects";
const TOOL_DESCRIPTION = `
Use this tool to retrieve a comprehensive list of all projects assigned to a specific staff member. This tool provides detailed information about project assignments, including:

- Complete project details (name, number, ID)
- Project timeline information (start date, end date, duration)
- Project assignment overview for the specified staff member
- Project workload distribution and time allocation

This is useful when you need to:
- Understand a staff member's current project workload
- Analyze project assignments and time commitments
- Get insights into staff member's project portfolio
- Track project participation and involvement
- Generate staff project reports and summaries
- Assess resource allocation and project distribution

Provide the staff member's name as input to get their complete project assignment list and project details.
`;

const getStaffProjectsSchema = z.object({
  name: z
    .string()
    .describe("The name of the staff member to query project assignments for"),
});

export class GetStaffProjectsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getStaffProjectsSchema;

  async execute(args?: z.infer<typeof getStaffProjectsSchema>) {
    try {
      if (!args?.name) {
        throw new Error("Staff name is required");
      }

      const endpoint = `/tools/analytics/get-staff-projects?name=${encodeURIComponent(args.name)}`;

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Project Assignments for ${args.name}\n\n`;

      if (
        data.projects &&
        Array.isArray(data.projects) &&
        data.projects.length > 0
      ) {
        formattedText += `**Total Projects Assigned: ${data.projects.length}**\n\n`;
        formattedText += `**Project List:**\n\n`;

        data.projects.forEach((project: any, index: number) => {
          formattedText += `${index + 1}. **${project.name}**\n`;
          if (project.number) {
            formattedText += `   - Project Number: ${project.number}\n`;
          }
          formattedText += `   - Project ID: ${project.id}\n`;
          formattedText += `   - Timeframe: ${project.timeframe}\n`;
          formattedText += `   - Start Date: ${project.start}\n`;
          formattedText += `   - End Date: ${project.end}\n`;
          formattedText += `   - Duration: ${project.duration_days} day${project.duration_days === 1 ? "" : "s"}\n`;
          formattedText += `\n`;
        });

        const totalDuration = data.projects.reduce(
          (sum: number, project: any) => sum + (project.duration_days || 0),
          0,
        );
        const activeProjects = data.projects.filter((project: any) => {
          const endDate = new Date(project.end);
          const today = new Date();
          return endDate >= today;
        });

        formattedText += `**Summary Statistics:**\n`;
        formattedText += `- Total Duration: ${totalDuration} days\n`;
        formattedText += `- Active Projects: ${activeProjects.length}\n`;
        formattedText += `- Average Project Duration: ${Math.round(totalDuration / data.projects.length)} days\n`;
      } else {
        formattedText += `**No projects found for this staff member.**\n\n`;
        if (data.projects) {
          formattedText += `**Raw Data:**\n\n`;
          formattedText += `\`\`\`json\n${JSON.stringify(data.projects, null, 2)}\n\`\`\`\n`;
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
      console.error("Error executing get staff projects tool", error);
      throw error;
    }
  }
}
