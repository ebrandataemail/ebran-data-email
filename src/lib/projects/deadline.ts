export type PriorityLevel = "low" | "medium" | "high";

export interface ProjectDescriptionParsed {
  dueDate: string | null;
  priority: PriorityLevel;
  cleanDescription: string;
}

export interface DeadlineInfo {
  type: "overdue" | "nearing" | "upcoming";
  days: number;
  label: string;
  formattedDate: string;
  badgeClass: string;
  cardBorderClass: string;
}

export interface PriorityInfo {
  level: PriorityLevel;
  label: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Extracts due date & priority metadata from project description.
 * Encoded format: "[due:YYYY-MM-DD] [priority:high] Actual description text..."
 */
export function parseProjectDescription(
  rawDescription: string | null | undefined,
): ProjectDescriptionParsed {
  if (!rawDescription) return { dueDate: null, priority: "medium", cleanDescription: "" };

  let remaining = rawDescription;
  let dueDate: string | null = null;
  let priority: PriorityLevel = "medium";

  const dueMatch = remaining.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
  if (dueMatch) {
    dueDate = dueMatch[1];
    remaining = remaining.replace(dueMatch[0], "");
  }

  const priorityMatch = remaining.match(/\[priority:(low|medium|high)\]/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as PriorityLevel;
    remaining = remaining.replace(priorityMatch[0], "");
  }

  return {
    dueDate,
    priority,
    cleanDescription: remaining.trim(),
  };
}

/**
 * Encodes due date & priority metadata cleanly into project description.
 */
export function formatProjectDescription(
  cleanDescription: string,
  dueDate: string | null | undefined,
  priority: PriorityLevel = "medium",
): string {
  const trimmed = (cleanDescription || "").trim();
  const tags: string[] = [];

  if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    tags.push(`[due:${dueDate}]`);
  }
  if (priority && ["low", "medium", "high"].includes(priority)) {
    tags.push(`[priority:${priority}]`);
  }

  if (tags.length > 0) {
    return `${tags.join(" ")} ${trimmed}`;
  }
  return trimmed;
}

/**
 * Evaluates urgency and relative distance to due date.
 */
export function getDeadlineInfo(dueDateStr: string | null | undefined): DeadlineInfo | null {
  if (!dueDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split("-").map(Number);
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      type: "overdue",
      days: diffDays,
      formattedDate,
      label: `Terlewat ${daysOverdue} hari (${formattedDate})`,
      badgeClass:
        "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800 font-semibold",
      cardBorderClass:
        "border-rose-400 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 shadow-rose-100 dark:shadow-none",
    };
  }

  if (diffDays <= 2) {
    const labelText =
      diffDays === 0
        ? `Tenggat HARI INI (${formattedDate})`
        : diffDays === 1
          ? `Tenggat BESOK (${formattedDate})`
          : `Tenggat ${diffDays} Hari lagi (${formattedDate})`;

    return {
      type: "nearing",
      days: diffDays,
      formattedDate,
      label: labelText,
      badgeClass:
        "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-800 font-medium animate-pulse",
      cardBorderClass:
        "border-amber-400 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 shadow-amber-100 dark:shadow-none",
    };
  }

  return {
    type: "upcoming",
    days: diffDays,
    formattedDate,
    label: `Tenggat: ${formattedDate}`,
    badgeClass: "bg-muted text-muted-foreground border-border",
    cardBorderClass: "",
  };
}

/**
 * Returns color-coded metadata and labels for priority levels.
 */
export function getPriorityInfo(priority: PriorityLevel | string | undefined): PriorityInfo {
  const p = (priority || "medium").toLowerCase() as PriorityLevel;
  if (p === "high") {
    return {
      level: "high",
      label: "Tinggi",
      badgeClass:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800 font-semibold",
      dotClass: "bg-red-500",
    };
  }
  if (p === "low") {
    return {
      level: "low",
      label: "Rendah",
      badgeClass:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      dotClass: "bg-slate-400",
    };
  }
  return {
    level: "medium",
    label: "Sedang",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
  };
}
