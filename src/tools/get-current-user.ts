import { BaseTool } from "../utils/base-tool.js";
import { freispaceClient } from "../utils/http-client.js";

const TOOL_NAME = "get_current_user";
const TOOL_DESCRIPTION =
  "Who the calling user is: name, email and their linked staff record. " +
  "Use it to resolve 'I', 'me' or 'my' to a staff name for other tools.";

interface Response {
  firstname: string;
  lastname: string;
  email: string;
  staff?: {
    display_name: string;
    title?: string | null;
    number?: string | null;
    internal: boolean;
  } | null;
}

export class GetCurrentUserTool extends BaseTool {
  name = TOOL_NAME;
  description = TOOL_DESCRIPTION;

  async execute() {
    const { data } = await freispaceClient.get<Response>("/user");

    let text = `${data.firstname} ${data.lastname} (${data.email})`;
    if (data.staff) {
      text += `\nStaff record: ${data.staff.display_name}`;
      if (data.staff.title) text += ` — ${data.staff.title}`;
      if (data.staff.number?.trim()) text += ` (#${data.staff.number})`;
      if (!data.staff.internal) text += ` [external]`;
    } else {
      text += `\nNo linked staff record.`;
    }
    text += `\n`;

    return { content: [{ type: "text" as const, text }] };
  }
}
