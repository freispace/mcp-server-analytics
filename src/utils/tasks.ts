export interface TaskItem {
  title: string;
  due_date?: string | null;
  priority?: number | null;
  is_checked: boolean;
  overdue: boolean;
  reference: { kind: string; name?: string | null };
  assignees?: string[] | null;
}

export const taskLine = (t: TaskItem) => {
  let out = `- ${t.is_checked ? "[done] " : ""}${t.title.trim() || "(untitled)"}`;
  if (t.due_date) out += ` — due ${t.due_date}`;
  if (t.overdue && !t.is_checked) out += ` (OVERDUE)`;
  if (typeof t.priority === "number") out += ` · priority ${t.priority}`;
  if (t.reference?.name) out += ` · ${t.reference.kind} ${t.reference.name}`;
  if (t.assignees?.length) out += ` · assigned: ${t.assignees.join(", ")}`;
  return `${out}\n`;
};
