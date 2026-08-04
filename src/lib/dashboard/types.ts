export type LeadStatus =
  | "neu"
  | "audit_offen"
  | "priorisiert"
  | "kontaktiert"
  | "gespraech"
  | "angebot"
  | "gewonnen"
  | "verloren";

export type LeadPriority = "niedrig" | "mittel" | "hoch";
export type AuditBand = "kritisch" | "verbesserungsbedarf" | "solide" | "gut_aufgestellt";
export type AuditCategory =
  | "google_profil"
  | "website"
  | "bewertungen"
  | "lokale_auffindbarkeit"
  | "inhalte_bilder"
  | "vertrauen_kontakt";
export type OfferStatus = "entwurf" | "erstellt" | "versendet" | "angenommen" | "abgelehnt" | "abgelaufen";
export type OfferInterval = "einmalig" | "monatlich" | "laufzeit";
export type ProjectStatus = "vorbereitung" | "in_arbeit" | "wartet_auf_kunde" | "abnahme" | "abgeschlossen" | "pausiert";
export type TaskStatus = "offen" | "erledigt";

/** Lebenszyklus eines Anrufdatensatzes: geplant, durchgeführt oder verworfen. */
export type CallState = "geplant" | "erledigt" | "abgesagt";
/** Ergebnis eines durchgeführten Anrufs. Getrennt vom Lebenszyklus. */
export type CallOutcome =
  | "gespraech"
  | "rueckruf"
  | "kein_interesse"
  | "nicht_erreicht"
  | "falsche_nummer";

export type DashboardWorkItem = {
  id: string;
  kind: "lead_follow_up" | "project_task" | "call";
  title: string;
  context: string;
  dueAt: string;
  priority: LeadPriority;
  href: string;
  overdue: boolean;
};

export type DashboardMetric = {
  id: "calls_due" | "overdue_followups" | "due_today" | "open_tasks" | "pending_offers";
  label: string;
  value: number;
  href: string;
  tone: "neutral" | "warning" | "danger";
};

export type PipelineDatum = {
  status: LeadStatus;
  label: string;
  count: number;
  share: number;
  href: string;
};

export type DashboardOverview = {
  workItems: DashboardWorkItem[];
  todayMetrics: DashboardMetric[];
  pipeline: PipelineDatum[];
  pipelineTotal: number;
  wonCount: number;
  lostCount: number;
  pendingOffers: Array<{
    id: number;
    label: string;
    companyName: string;
    validUntil: string;
    href: string;
  }>;
  blockedProjects: Array<{
    id: number;
    name: string;
    companyName: string;
    href: string;
  }>;
  recentLeads: Array<{
    id: number;
    company_name: string;
    status: LeadStatus;
    priority: LeadPriority;
    updated_at: string;
  }>;
};

/** Eine Zeile in der Anrufliste. `callId` ist null, solange nur ein Lead ohne geplanten Anruf vorliegt. */
export type CallQueueEntry = {
  callId: number | null;
  leadId: number;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  priority: LeadPriority;
  leadStatus: LeadStatus;
  scheduledAt: string | null;
  note: string | null;
  attempts: number;
  lastOutcome: CallOutcome | null;
  lastCalledAt: string | null;
  lastNote: string | null;
  idleDays: number | null;
  doNotCall: boolean;
};

export type CallQueue = {
  ueberfaellig: CallQueueEntry[];
  heute: CallQueueEntry[];
  demnaechst: CallQueueEntry[];
  anrufbar: CallQueueEntry[];
  dueCount: number;
};

export type LeadCallHistoryEntry = {
  id: number;
  state: CallState;
  outcome: CallOutcome | null;
  scheduledAt: string | null;
  calledAt: string | null;
  phone: string | null;
  note: string | null;
  rescheduledToId: number | null;
};

export type AuditCategoryScore = {
  category: AuditCategory;
  label: string;
  score: number;
  contribution: number;
  maximum: number;
  answered: number;
  criteria: number;
  band: AuditBand;
};

export type AuditCriterion = {
  key: string;
  category: AuditCategory;
  categoryLabel: string;
  label: string;
  description: string;
  weight: number;
  recommendationIds: string[];
};

export type AuditAnswerInput = {
  criterionKey: string;
  rating: 0 | 1 | 2 | 3;
  note?: string;
};

export type Recommendation = {
  catalogItemId: string;
  catalogItemName: string;
  reason: string;
  priority: LeadPriority;
  selected: boolean;
};

export type GooglePlaceSnapshot = {
  place_id?: string;
  name?: string | null;
  address?: string | null;
  phone?: string | null | boolean;
  website?: string | null | boolean;
  has_opening_hours?: boolean;
  has_description?: boolean;
  rating?: number;
  review_count?: number;
  photos_count?: number;
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  neu: "Neu",
  audit_offen: "Audit offen",
  priorisiert: "Priorisiert",
  kontaktiert: "Kontaktiert",
  gespraech: "Gespräch",
  angebot: "Angebot",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

export const callStateLabels: Record<CallState, string> = {
  geplant: "Offen",
  erledigt: "Getätigt",
  abgesagt: "Abgesagt",
};

export const callOutcomeLabels: Record<CallOutcome, string> = {
  gespraech: "Gespräch geführt",
  rueckruf: "Rückruf vereinbart",
  kein_interesse: "Kein Interesse",
  nicht_erreicht: "Nicht erreicht",
  falsche_nummer: "Falsche Nummer",
};

export const priorityLabels: Record<LeadPriority, string> = {
  niedrig: "Niedrig",
  mittel: "Mittel",
  hoch: "Hoch",
};

export const auditBandLabels: Record<AuditBand, string> = {
  kritisch: "Kritisch",
  verbesserungsbedarf: "Verbesserungsbedarf",
  solide: "Solide",
  gut_aufgestellt: "Gut aufgestellt",
};

export const offerStatusLabels: Record<OfferStatus, string> = {
  entwurf: "Entwurf",
  erstellt: "Erstellt",
  versendet: "Versendet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  abgelaufen: "Abgelaufen",
};

export const projectStatusLabels: Record<ProjectStatus, string> = {
  vorbereitung: "Vorbereitung",
  in_arbeit: "In Arbeit",
  wartet_auf_kunde: "Wartet auf Kunde",
  abnahme: "Abnahme",
  abgeschlossen: "Abgeschlossen",
  pausiert: "Pausiert",
};
