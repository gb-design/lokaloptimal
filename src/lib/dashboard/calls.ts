import { viennaDayBounds } from "./insights";
import type {
  CallOutcome,
  CallQueue,
  CallQueueEntry,
  CallState,
  LeadPriority,
  LeadStatus,
} from "./types";

export type CallRow = {
  id: number;
  lead_id: number;
  state: CallState;
  outcome: CallOutcome | null;
  scheduled_at: string | null;
  called_at: string | null;
  phone: string | null;
  note: string | null;
};

export type CallLeadRow = {
  id: number;
  company_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  priority: LeadPriority;
  status: LeadStatus;
  do_not_call: boolean;
  updated_at: string;
};

export const callOutcomes: CallOutcome[] = [
  "gespraech",
  "rueckruf",
  "nicht_erreicht",
  "kein_interesse",
  "falsche_nummer",
];

/** Status, aus denen heraus ein geführtes Gespräch den Lead noch voranbringt. */
const beforeContact: LeadStatus[] = ["neu", "audit_offen", "priorisiert"];
/** Leads in diesen Status stehen nicht mehr zum Anrufen an. */
const closedStatuses: LeadStatus[] = ["gewonnen", "verloren"];

const priorityRank: Record<LeadPriority, number> = { hoch: 0, mittel: 1, niedrig: 2 };

const dayInMs = 24 * 60 * 60 * 1000;

/** Nur ein geplanter Anruf lässt sich abschließen. Korrekturen laufen über einen neuen Eintrag. */
export function canLogOutcome(state: CallState) {
  return state === "geplant";
}

/** Ein vereinbarter Rückruf braucht zwingend einen neuen Termin, sonst verliert sich der Lead. */
export function requiresFollowUp(outcome: CallOutcome) {
  return outcome === "rueckruf";
}

/**
 * Vorschlag für das Statushäkchen im Ergebnisformular.
 * Stuft einen bereits weiter fortgeschrittenen Lead niemals zurück und gibt
 * null zurück, wenn der Vorschlag nichts ändern würde.
 */
export function suggestLeadStatus(outcome: CallOutcome, currentStatus: LeadStatus): LeadStatus | null {
  if (outcome === "kein_interesse") {
    return currentStatus === "verloren" ? null : "verloren";
  }
  if (outcome === "gespraech" || outcome === "rueckruf") {
    return beforeContact.includes(currentStatus) ? "kontaktiert" : null;
  }
  return null;
}

function toEntry(lead: CallLeadRow, call: CallRow | null, history: CallRow[], now: Date): CallQueueEntry {
  const attempts = history.length;
  const last = history[0] || null;
  const reference = last?.called_at || lead.updated_at;
  return {
    callId: call?.id ?? null,
    leadId: lead.id,
    companyName: lead.company_name,
    contactName: lead.contact_name,
    phone: call?.phone || lead.contact_phone,
    priority: lead.priority,
    leadStatus: lead.status,
    scheduledAt: call?.scheduled_at ?? null,
    note: call?.note ?? null,
    attempts,
    lastOutcome: last?.outcome ?? null,
    lastCalledAt: last?.called_at ?? null,
    lastNote: last?.note ?? null,
    idleDays: Math.max(0, Math.floor((now.getTime() - new Date(reference).getTime()) / dayInMs)),
    doNotCall: lead.do_not_call,
  };
}

/**
 * Baut die Anrufliste: geplante Anrufe nach Fälligkeit gebündelt, dazu die Leads,
 * die man anrufen könnte, weil sie eine Nummer haben und kein Termin offen ist.
 */
export function buildCallQueue(calls: CallRow[], leads: CallLeadRow[], now = new Date()): CallQueue {
  const { start, end } = viennaDayBounds(now);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const historyByLead = new Map<number, CallRow[]>();
  for (const call of calls) {
    if (call.state !== "erledigt") continue;
    const bucket = historyByLead.get(call.lead_id) || [];
    bucket.push(call);
    historyByLead.set(call.lead_id, bucket);
  }
  for (const history of historyByLead.values()) {
    history.sort((a, b) => (b.called_at || "").localeCompare(a.called_at || ""));
  }

  const ueberfaellig: CallQueueEntry[] = [];
  const heute: CallQueueEntry[] = [];
  const demnaechst: CallQueueEntry[] = [];
  const scheduledLeadIds = new Set<number>();

  const planned = calls
    .filter((call) => call.state === "geplant" && call.scheduled_at)
    .sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || ""));

  for (const call of planned) {
    const lead = leadById.get(call.lead_id);
    if (!lead) continue;
    scheduledLeadIds.add(lead.id);
    const entry = toEntry(lead, call, historyByLead.get(lead.id) || [], now);
    const due = new Date(call.scheduled_at!).getTime();
    if (due < start.getTime()) ueberfaellig.push(entry);
    else if (due < end.getTime()) heute.push(entry);
    else demnaechst.push(entry);
  }

  const anrufbar = leads
    .filter(
      (lead) =>
        !scheduledLeadIds.has(lead.id) &&
        !lead.do_not_call &&
        Boolean(lead.contact_phone) &&
        !closedStatuses.includes(lead.status),
    )
    .map((lead) => toEntry(lead, null, historyByLead.get(lead.id) || [], now))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (b.idleDays || 0) - (a.idleDays || 0));

  return {
    ueberfaellig,
    heute,
    demnaechst,
    anrufbar,
    dueCount: ueberfaellig.length + heute.length,
  };
}
