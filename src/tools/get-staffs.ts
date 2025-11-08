import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "staffs_query";
const TOOL_DESCRIPTION = `
Use this tool to retrieve a comprehensive list of all staff members in the organization. This tool provides detailed information about the entire workforce, including:

- Complete staff directory with all employees
- Individual staff member details (name, title, role, number)
- Organizational structure and role distribution
- Contact information and identifiers

This is useful when you need to:
- Get an overview of all staff members
- Find specific employees by browsing the complete list
- Understand the organizational structure and roles
- Get staff numbers and titles for reference
- Answer questions about who works in the company

Use this tool when users ask about:
- "/staff" command or similar requests
- "Who are the staff members?" or "List all employees"
- "What roles do we have in the company?"
- General inquiries about the workforce or team members
- Looking for specific people without knowing their exact names
`;

export class GetStaffsTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;

  async execute() {
    try {
      const response = await freispaceClient.get("/tools/analytics/get-staffs");

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data as any[];
      let formattedText = `# Staff Directory\n\n`;

      if (Array.isArray(data) && data.length > 0) {
        formattedText += `**Total Staff Members: ${data.length}**\n\n`;
        formattedText += `**Staff List:**\n\n`;

        data.forEach((staff: any, index: number) => {
          formattedText += `${index + 1}. **${staff.display_name || "Unknown"}**\n`;
          formattedText += `   - Title: ${staff.title || "N/A"}\n`;
          if (staff.number && staff.number.trim()) {
            formattedText += `   - Number: ${staff.number}\n`;
          }
          formattedText += `   - ID: ${staff.id || "N/A"}\n`;
          formattedText += `\n`;
        });

        const titleCounts = data.reduce((acc: any, staff: any) => {
          const title = staff.title || "No Title";
          acc[title] = (acc[title] || 0) + 1;
          return acc;
        }, {});

        formattedText += `**Role Distribution:**\n\n`;
        Object.entries(titleCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .forEach(([title, count], index) => {
            formattedText += `${index + 1}. ${title}: ${count} staff member${count === 1 ? "" : "s"}\n`;
          });
      } else {
        formattedText += `**No staff members found or unexpected data format.**\n\n`;
        if (data) {
          formattedText += `**Raw Data:**\n\n`;
          formattedText += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
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
      console.error("Error executing staffs query tool", error);
      throw error;
    }
  }
}
