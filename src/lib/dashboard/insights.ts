import {
  leadStatusLabels,
  priorityLabels,
  type DashboardMetric,
  type DashboardOverview,
  type DashboardWorkItem,
  type LeadPriority,
  type LeadStatus,
  type PipelineDatum,
} from "./types";

export const DASHBOARD_TIME_ZONE = "Europe/Vienna";

export type NormalizedLeadFilters = {
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  due?: "today" | "overdue";
  page: number;
};

const pipelineStatuses: LeadStatus[] = [
  "neu",
  "audit_offen",
  "priorisiert",
  "kontaktiert",
  "gespraech",
  "angebot",
];

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type LeadOverviewRow = {
  id: number;
  company_name: string;
  status: LeadStatus;
  priority: LeadPriority;
  next_action?: string | null;
  next_action_at?: string | null;
  updated_at: string;
};

type TaskOverviewRow = {
  id: number;
  title: string;
  priority: LeadPriority;
  due_at?: string | null;
  status: "offen" | "erledigt";
  project: { id: number; name: string } | Array<{ id: number; name: string }>;
};

type OfferOverviewRow = {
  id: number;
  offer_number?: string | null;
  status: string;
  valid_until: string;
  lead: { company_name: string } | Array<{ company_name: string }>;
};

type ProjectOverviewRow = {
  id: number;
  name: string;
  status: string;
  lead: { company_name: string } | Array<{ company_name: string }>;
};

type CallOverviewRow = {
  id: number;
  scheduled_at: string;
  lead:
    | { id: number; company_name: string; priority: LeadPriority }
    | Array<{ id: number; company_name: string; priority: LeadPriority }>;
};

function firstRelation<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

function zonedParts(date: Date, timeZone = DASHBOARD_TIME_ZONE): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function timeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const hour = read("hour") === 24 ? 0 : read("hour");
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedMidnight(parts: DateParts, timeZone = DASHBOARD_TIME_ZONE) {
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day);
  let instant = new Date(wallClock);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    instant = new Date(wallClock - timeZoneOffset(instant, timeZone));
  }
  return instant;
}

function nextCalendarDay(parts: DateParts): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function viennaDayBounds(now = new Date()) {
  const today = zonedParts(now);
  return {
    start: zonedMidnight(today),
    end: zonedMidnight(nextCalendarDay(today)),
  };
}

export function normalizeLeadFilters(input: {
  search?: string | null;
  status?: string | null;
  priority?: string | null;
  due?: string | null;
  page?: number | string | null;
}): NormalizedLeadFilters {
  const statuses = Object.keys(leadStatusLabels) as LeadStatus[];
  const priorities = Object.keys(priorityLabels) as LeadPriority[];
  const rawPage = Number(input.page || 1);
  return {
    search: input.search?.trim() || undefined,
    status: statuses.includes(input.status as LeadStatus) ? input.status as LeadStatus : undefined,
    priority: priorities.includes(input.priority as LeadPriority) ? input.priority as LeadPriority : undefined,
    due: input.due === "today" || input.due === "overdue" ? input.due : undefined,
    page: Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1,
  };
}

export function calculateProjectProgress(
  tasks: Array<{ status: "offen" | "erledigt"; due_at?: string | null }>,
  now = new Date(),
) {
  const completed = tasks.filter((task) => task.status === "erledigt").length;
  const open = tasks.length - completed;
  const overdue = tasks.filter(
    (task) => task.status === "offen" && task.due_at && new Date(task.due_at).getTime() < now.getTime(),
  ).length;
  return {
    total: tasks.length,
    completed,
    open,
    overdue,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

function isWithin(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= start.getTime() && time < end.getTime();
}

export function buildDashboardOverview(
  leads: LeadOverviewRow[],
  tasks: TaskOverviewRow[],
  offers: OfferOverviewRow[],
  projects: ProjectOverviewRow[],
  calls: CallOverviewRow[] = [],
  now = new Date(),
): DashboardOverview {
  const { start, end } = viennaDayBounds(now);
  const activeTasks = tasks.filter((task) => task.status === "offen");
  const overdueLeads = leads.filter(
    (lead) => lead.next_action_at && new Date(lead.next_action_at).getTime() < start.getTime(),
  );
  const leadsDueToday = leads.filter((lead) => isWithin(lead.next_action_at, start, end));
  const dueCalls = calls.filter((call) => new Date(call.scheduled_at).getTime() < end.getTime());
  const pendingOffers = offers
    .filter((offer) => offer.status === "versendet")
    .map((offer) => {
      const lead = firstRelation(offer.lead);
      return {
        id: offer.id,
        label: offer.offer_number || `Angebot #${offer.id}`,
        companyName: lead?.company_name || "Unbekanntes Unternehmen",
        validUntil: offer.valid_until,
        href: `/dashboard/offers/${offer.id}`,
      };
    })
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil))
    .slice(0, 5);

  const workItems: DashboardWorkItem[] = [
    ...dueCalls.map((call) => {
      const lead = firstRelation(call.lead);
      return {
        id: `call-${call.id}`,
        kind: "call" as const,
        title: "Anruf",
        context: lead?.company_name || "Unbekanntes Unternehmen",
        dueAt: call.scheduled_at,
        priority: lead?.priority || ("mittel" as LeadPriority),
        href: "/dashboard/calls",
        overdue: new Date(call.scheduled_at).getTime() < start.getTime(),
      };
    }),
    ...leads
      .filter((lead) => lead.next_action_at && new Date(lead.next_action_at).getTime() < end.getTime())
      .map((lead) => ({
        id: `lead-${lead.id}`,
        kind: "lead_follow_up" as const,
        title: lead.next_action || "Nächsten Schritt festlegen",
        context: lead.company_name,
        dueAt: lead.next_action_at!,
        priority: lead.priority,
        href: `/dashboard/leads/${lead.id}`,
        overdue: new Date(lead.next_action_at!).getTime() < start.getTime(),
      })),
    ...activeTasks
      .filter((task) => task.due_at && new Date(task.due_at).getTime() < end.getTime())
      .map((task) => {
        const project = firstRelation(task.project);
        return {
          id: `task-${task.id}`,
          kind: "project_task" as const,
          title: task.title,
          context: project?.name || "Kundenprojekt",
          dueAt: task.due_at!,
          priority: task.priority,
          href: `/dashboard/projects/${project?.id}`,
          overdue: new Date(task.due_at!).getTime() < start.getTime(),
        };
      }),
  ]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 16);

  const counts = new Map<LeadStatus, number>();
  for (const lead of leads) counts.set(lead.status, (counts.get(lead.status) || 0) + 1);
  const pipelineTotal = pipelineStatuses.reduce((sum, status) => sum + (counts.get(status) || 0), 0);
  const pipeline: PipelineDatum[] = pipelineStatuses.map((status) => {
    const count = counts.get(status) || 0;
    return {
      status,
      label: leadStatusLabels[status],
      count,
      share: pipelineTotal ? Math.round((count / pipelineTotal) * 100) : 0,
      href: `/dashboard/leads?status=${status}`,
    };
  });

  const todayMetrics: DashboardMetric[] = [
    {
      id: "calls_due",
      label: "Anrufe fällig",
      value: dueCalls.length,
      href: "/dashboard/calls",
      tone: dueCalls.some((call) => new Date(call.scheduled_at).getTime() < start.getTime())
        ? "danger"
        : dueCalls.length
          ? "warning"
          : "neutral",
    },
    {
      id: "overdue_followups",
      label: "Follow-ups überfällig",
      value: overdueLeads.length,
      href: "/dashboard/leads?due=overdue",
      tone: overdueLeads.length ? "danger" : "neutral",
    },
    {
      id: "due_today",
      label: "Heute fällig",
      value: leadsDueToday.length,
      href: "/dashboard/leads?due=today",
      tone: leadsDueToday.length ? "warning" : "neutral",
    },
    {
      id: "open_tasks",
      label: "Aufgaben offen",
      value: activeTasks.length,
      href: "/dashboard/projects",
      tone: "neutral",
    },
    {
      id: "pending_offers",
      label: "Angebote ausstehend",
      value: offers.filter((offer) => offer.status === "versendet").length,
      href: "/dashboard/offers",
      tone: "neutral",
    },
  ];

  return {
    workItems,
    todayMetrics,
    pipeline,
    pipelineTotal,
    wonCount: counts.get("gewonnen") || 0,
    lostCount: counts.get("verloren") || 0,
    pendingOffers,
    blockedProjects: projects
      .filter((project) => project.status === "wartet_auf_kunde")
      .map((project) => ({
        id: project.id,
        name: project.name,
        companyName: firstRelation(project.lead)?.company_name || "Unbekanntes Unternehmen",
        href: `/dashboard/projects/${project.id}`,
      }))
      .slice(0, 5),
    recentLeads: [...leads]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 8)
      .map(({ id, company_name, status, priority, updated_at }) => ({
        id,
        company_name,
        status,
        priority,
        updated_at,
      })),
  };
}
