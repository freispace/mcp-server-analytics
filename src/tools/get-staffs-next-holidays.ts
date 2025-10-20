import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "staffs_next_holidays_query";
const TOOL_DESCRIPTION = `
Use this tool to get information about the next upcoming holidays for a staff member. This tool provides:

- Staff member details (name, title, ID, number)
- Holiday start and end dates
- Holiday duration (length in days)
- Additional comments about the holiday

If no name is provided, the tool will return the next holidays for the assigned staff of the user.

This is useful when you need to:
- Check when someone will be on holiday next
- Plan project timelines around staff availability
- Get upcoming absence information for team planning
- Understand holiday schedules for resource allocation

Optionally provide a staff member's name to get their specific holiday information.
`;

const getStaffNextHolidaysSchema = z.object({
  name: z
    .string()
    .optional()
    .describe(
      "The name of the staff member to query holiday data for. If not provided, uses the assigned staff of the user.",
    ),
});

export class GetStaffsNextHolidaysTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getStaffNextHolidaysSchema;

  async execute(args?: z.infer<typeof getStaffNextHolidaysSchema>) {
    try {
      let endpoint = "/tools/analytics/get-staffs-next-holidays";
      if (args?.name) {
        endpoint += `?name=${encodeURIComponent(args.name)}`;
      }

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Next Holiday Information\n\n`;

      if (data.staff) {
        formattedText += `**Staff Member:**\n`;
        formattedText += `- Name: ${data.staff.display_name}\n`;
        formattedText += `- Title: ${data.staff.title}\n`;
        formattedText += `- ID: ${data.staff.id}\n`;
        if (data.staff.number) {
          formattedText += `- Number: ${data.staff.number}\n`;
        }
        formattedText += `\n`;
      }

      formattedText += `**Holiday Details:**\n`;
      formattedText += `- Start Date: ${data.start}\n`;
      formattedText += `- End Date: ${data.end}\n`;
      formattedText += `- Duration: ${data.length} day${data.length !== 1 ? "s" : ""}\n`;

      if (data.comment && data.comment.trim()) {
        formattedText += `- Comment: ${data.comment}\n`;
      }

      const startDate = new Date(data.start);
      const today = new Date();
      const daysUntil = Math.ceil(
        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntil > 0) {
        formattedText += `- Days until holiday: ${daysUntil}\n`;
      } else if (daysUntil === 0) {
        formattedText += `- Holiday starts today!\n`;
      } else {
        const endDate = new Date(data.end);
        const daysUntilEnd = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilEnd >= 0) {
          formattedText += `- Currently on holiday (ends in ${daysUntilEnd + 1} day${daysUntilEnd !== 0 ? "s" : ""})\n`;
        } else {
          formattedText += `- This holiday has already ended\n`;
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
      console.error("Error executing staffs next holidays tool", error);
      throw error;
    }
  }
}
