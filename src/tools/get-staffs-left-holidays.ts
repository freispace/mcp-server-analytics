import { z } from "zod";
import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "staffs_holidays_left_query";
const TOOL_DESCRIPTION = `
Use this tool to get information about remaining holiday quota for a staff member. This tool provides:

- Staff member details (name, title, ID, number)
- Year being queried
- Holidays taken so far
- Total holiday quota for the year
- Remaining holiday days left

If no name is provided, the tool will return the holiday quota information for the assigned staff of the user.
If no year is provided, the current year is used.

This is useful when you need to:
- Check how many holiday days someone has left
- Plan holiday requests and availability
- Monitor holiday usage across the team
- Understand remaining holiday allowances for resource planning

Optionally provide a staff member's name and/or year to get their specific holiday quota information.
`;

const getStaffLeftHolidaysSchema = z.object({
  name: z
    .string()
    .optional()
    .describe(
      "The name of the staff member to query holiday quota for. If not provided, uses the assigned staff of the user.",
    ),
  year: z
    .number()
    .optional()
    .describe(
      "The year to query holiday quota for. If not provided, uses the current year.",
    ),
});

export class GetStaffsLeftHolidaysTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;
  schema = getStaffLeftHolidaysSchema;

  async execute(args?: z.infer<typeof getStaffLeftHolidaysSchema>) {
    try {
      let endpoint = "/tools/analytics/get-staffs-left-holidays";
      const queryParams = [];

      if (args?.year) {
        queryParams.push(`year=${args.year}`);
      }

      if (args?.name) {
        queryParams.push(`name=${encodeURIComponent(args.name)}`);
      }

      if (queryParams.length > 0) {
        endpoint += `?${queryParams.join("&")}`;
      }

      const response = await freispaceClient.get<any>(endpoint);

      if (!response || !response.data) {
        throw new Error("No data received from the API");
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      const data = response.data;
      let formattedText = `# Holiday Quota Information\n\n`;

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

      formattedText += `**Holiday Quota for ${data.year}:**\n`;
      formattedText += `- Total Quota: ${data.quota_total} days\n`;
      formattedText += `- Days Taken: ${data.taken} days\n`;
      formattedText += `- Days Remaining: ${data.left} days\n`;

      const usagePercentage = ((data.taken / data.quota_total) * 100).toFixed(
        1,
      );
      formattedText += `- Usage: ${usagePercentage}% of quota used\n`;

      if (data.left === 0) {
        formattedText += `\n⚠️ **Warning:** No holiday days remaining for ${data.year}!\n`;
      } else if (data.left <= 5) {
        formattedText += `\n⚠️ **Notice:** Only ${data.left} holiday days remaining for ${data.year}.\n`;
      } else {
        formattedText += `\n✅ **Status:** ${data.left} holiday days available for planning.\n`;
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
      console.error("Error executing staffs holidays left tool", error);
      throw error;
    }
  }
}
