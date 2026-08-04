import type { APIContext, AstroGlobal } from "astro";
import { buildCallQueue } from "./calls";
import { buildDashboardOverview, normalizeLeadFilters, viennaDayBounds } from "./insights";
import type { LeadPriority, LeadStatus } from "./types";
import { createSupabaseServerClient } from "../supabase/server";

const callColumns = "id, lead_id, state, outcome, scheduled_at, called_at, phone, note";
const callLeadColumns =
  "id, company_name, contact_name, contact_phone, priority, status, do_not_call, updated_at";

type QueryContext =
  | Pick<APIContext, "request" | "cookies">
  | Pick<AstroGlobal, "request" | "cookies">;

function client(context: QueryContext) {
  return createSupabaseServerClient(context);
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, fallback: T): T {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? fallback;
}

export async function getOverview(context: QueryContext) {
  const supabase = client(context);
  const [leadResult, taskResult, offerResult, projectResult, callResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, company_name, status, priority, next_action, next_action_at, updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("project_tasks")
      .select("id, title, priority, due_at, status, project:projects!inner(id, name, owner_id)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(500),
    supabase
      .from("offers")
      .select("id, offer_number, status, valid_until, lead:leads!inner(company_name)")
      .order("valid_until", { ascending: true })
      .limit(500),
    supabase
      .from("projects")
      .select("id, name, status, lead:leads!inner(company_name)")
      .is("archived_at", null)
      .limit(100),
    supabase
      .from("lead_calls")
      .select("id, scheduled_at, lead:leads!inner(id, company_name, priority, archived_at)")
      .eq("state", "geplant")
      .order("scheduled_at", { ascending: true })
      .limit(500),
  ]);

  const calls = (unwrap(callResult, []) as any[]).filter((call) => !call.lead?.archived_at);

  return buildDashboardOverview(
    unwrap(leadResult, []) as any,
    unwrap(taskResult, []) as any,
    unwrap(offerResult, []) as any,
    unwrap(projectResult, []) as any,
    calls as any,
  );
}

/** Anrufliste: geplante Anrufe nach Fälligkeit plus die Leads, die man anrufen könnte. */
export async function getCallQueue(context: QueryContext) {
  const supabase = client(context);
  const [callResult, leadResult] = await Promise.all([
    supabase.from("lead_calls").select(callColumns).limit(2000),
    supabase.from("leads").select(callLeadColumns).is("archived_at", null).limit(500),
  ]);
  return buildCallQueue(unwrap(callResult, []) as any, unwrap(leadResult, []) as any);
}

export type LeadListFilters = {
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  due?: "today" | "overdue";
  page?: number;
};

export async function listLeads(context: QueryContext, filters: LeadListFilters | string = {}) {
  const normalized = normalizeLeadFilters(typeof filters === "string" ? { search: filters } : filters);
  const page = normalized.page;
  const from = (page - 1) * 25;
  let query = client(context)
    .from("leads")
    .select("*")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, from + 24);
  if (normalized.search?.trim()) {
    const safe = normalized.search.trim().replace(/[%_,]/g, "");
    query = query.or(`company_name.ilike.%${safe}%,contact_name.ilike.%${safe}%,location.ilike.%${safe}%`);
  }
  if (normalized.status) query = query.eq("status", normalized.status);
  if (normalized.priority) query = query.eq("priority", normalized.priority);
  if (normalized.due) {
    const { start, end } = viennaDayBounds();
    query = normalized.due === "overdue"
      ? query.lt("next_action_at", start.toISOString())
      : query.gte("next_action_at", start.toISOString()).lt("next_action_at", end.toISOString());
  }
  return unwrap(await query, []);
}

export async function getLead(context: QueryContext, id: number) {
  const supabase = client(context);
  const [lead, audits, offers, project, calls] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase
      .from("audits")
      .select("id, version, status, score, band, completed_at, updated_at")
      .eq("lead_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("offers")
      .select("id, offer_number, status, goal, once_total, monthly_total, valid_until, updated_at")
      .eq("lead_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, status, target_date")
      .eq("lead_id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("lead_calls")
      .select(`${callColumns}, rescheduled_to_id`)
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    lead: unwrap(lead, null as any),
    audits: unwrap(audits, []),
    offers: unwrap(offers, []),
    project: unwrap(project, null),
    calls: unwrap(calls, []),
  };
}

export async function listAudits(context: QueryContext) {
  return unwrap(
    await client(context)
      .from("audits")
      .select("id, version, status, score, band, updated_at, lead:leads!inner(id, company_name)")
      .order("updated_at", { ascending: false })
      .range(0, 24),
    [],
  );
}

export async function getAudit(context: QueryContext, id: number) {
  const supabase = client(context);
  const [audit, answers, recommendations] = await Promise.all([
    supabase
      .from("audits")
      .select("*, lead:leads!inner(id, company_name, google_maps_url, website_url, priority)")
      .eq("id", id)
      .single(),
    supabase.from("audit_answers").select("*").eq("audit_id", id),
    supabase.from("audit_recommendations").select("*").eq("audit_id", id).order("priority"),
  ]);
  return {
    audit: unwrap(audit, null as any),
    answers: unwrap(answers, []),
    recommendations: unwrap(recommendations, []),
  };
}

export async function listOffers(context: QueryContext) {
  return unwrap(
    await client(context)
      .from("offers")
      .select("id, offer_number, status, goal, once_total, monthly_total, valid_until, updated_at, lead:leads!inner(id, company_name)")
      .order("updated_at", { ascending: false })
      .range(0, 24),
    [],
  );
}

export async function getOffer(context: QueryContext, id: number) {
  const supabase = client(context);
  const [offer, items, project] = await Promise.all([
    supabase
      .from("offers")
      .select("*, lead:leads!inner(id, company_name, contact_name, location), audit:audits(id, score, band)")
      .eq("id", id)
      .single(),
    supabase.from("offer_items").select("*").eq("offer_id", id).order("sort_order"),
    supabase.from("projects").select("id, name, status").eq("offer_id", id).maybeSingle(),
  ]);
  return {
    offer: unwrap(offer, null as any),
    items: unwrap(items, []),
    project: unwrap(project, null),
  };
}

export async function listProjects(context: QueryContext) {
  return unwrap(
    await client(context)
      .from("projects")
      .select("id, name, status, target_date, updated_at, lead:leads!inner(id, company_name), tasks:project_tasks(id, status, due_at)")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .range(0, 24),
    [],
  );
}

export async function getProject(context: QueryContext, id: number) {
  const supabase = client(context);
  const [project, tasks] = await Promise.all([
    supabase
      .from("projects")
      .select("*, lead:leads!inner(id, company_name, contact_name, contact_email, contact_phone), offer:offers(id, offer_number, status)")
      .eq("id", id)
      .single(),
    supabase.from("project_tasks").select("*").eq("project_id", id).order("sort_order").order("due_at"),
  ]);
  return {
    project: unwrap(project, null as any),
    tasks: unwrap(tasks, []),
  };
}

export async function getWorkspaceSettings(context: QueryContext) {
  const supabase = client(context);
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const result = await supabase.from("workspace_settings").select("*").eq("owner_id", authData.user.id).maybeSingle();
  return unwrap(result, null);
}
