import { ActionError, defineAction } from "astro:actions";
import { z } from "zod";
import {
  auditBand,
  auditCriteria,
  calculateAuditScore,
  priorityFromScore,
  recommendationsFromAnswers,
} from "../lib/dashboard/audit";
import { buildOfferItems, calculateOfferTotals } from "../lib/dashboard/offers";
import type {
  AuditAnswerInput,
  LeadPriority,
  LeadStatus,
  OfferStatus,
  ProjectStatus,
} from "../lib/dashboard/types";
import { createSupabaseServerClient } from "../lib/supabase/server";
import {
  canArchiveOffer,
  canConvertOfferToProject,
  canDeleteOffer,
  canEditOffer,
  canTransitionOffer,
  leadStatusRequiresFollowUp,
} from "../lib/dashboard/workflow";
import { canLogOutcome, requiresFollowUp, suggestLeadStatus } from "../lib/dashboard/calls";
import type { CallOutcome } from "../lib/dashboard/types";

const leadStatuses = ["neu", "audit_offen", "priorisiert", "kontaktiert", "gespraech", "angebot", "gewonnen", "verloren"] as const;
const priorities = ["niedrig", "mittel", "hoch"] as const;
const offerStatuses = ["entwurf", "erstellt", "versendet", "angenommen", "abgelehnt", "abgelaufen"] as const;
const projectStatuses = ["vorbereitung", "in_arbeit", "wartet_auf_kunde", "abnahme", "abgeschlossen", "pausiert"] as const;
const callOutcomeValues = ["gespraech", "rueckruf", "kein_interesse", "nicht_erreicht", "falsche_nummer"] as const;

function fail(message: string, code: ConstructorParameters<typeof ActionError>[0]["code"] = "BAD_REQUEST"): never {
  throw new ActionError({ code, message });
}

async function authenticated(context: Parameters<ReturnType<typeof defineAction>["orThrow"]>[0] | any) {
  const supabase = createSupabaseServerClient(context);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) fail("Bitte melden Sie sich erneut an.", "UNAUTHORIZED");
  return { supabase, user: data.user! };
}

function nullable(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function assertLeadFollowUp(status: LeadStatus, nextAction?: string | null, nextActionAt?: string | null) {
  if (leadStatusRequiresFollowUp(status) && (!nullable(nextAction) || !nullable(nextActionAt))) {
    fail("Für diesen Status brauchen Sie einen nächsten Schritt und ein Fälligkeitsdatum.");
  }
}

async function loadCallLead(supabase: any, leadId: number) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, status, contact_phone, next_action, next_action_at, do_not_call")
    .eq("id", leadId)
    .single();
  if (error || !data) fail("Der Lead wurde nicht gefunden.", "NOT_FOUND");
  return data as {
    id: number;
    status: LeadStatus;
    contact_phone: string | null;
    next_action: string | null;
    next_action_at: string | null;
    do_not_call: boolean;
  };
}

async function ensureOfferEditable(supabase: any, offerId: number) {
  const { data, error } = await supabase.from("offers").select("id, status, archived_at").eq("id", offerId).single();
  if (error || !data) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");
  if (!canEditOffer(data.status as OfferStatus)) {
    fail("Dieses Angebot ist gesperrt, weil es bereits versendet wurde. Duplizieren Sie es für Änderungen.");
  }
  return data;
}

/** Angebote mit angehängtem Projekt sind unantastbar — sonst greift der Fremdschlüssel. */
async function offerHasProject(supabase: any, offerId: number) {
  const { data } = await supabase.from("projects").select("id").eq("offer_id", offerId).maybeSingle();
  return Boolean(data);
}

export const server = {
  signIn: defineAction({
    input: z.object({
      email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
      password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
    }),
    async handler(input, context) {
      const supabase = createSupabaseServerClient(context);
      const { error } = await supabase.auth.signInWithPassword(input);
      if (error) fail("Die Anmeldung hat nicht funktioniert. Bitte prüfen Sie E-Mail und Passwort.", "UNAUTHORIZED");
      return { ok: true };
    },
  }),

  signOut: defineAction({
    async handler(_input, context) {
      const { supabase } = await authenticated(context);
      await supabase.auth.signOut();
      return { ok: true };
    },
  }),

  createLead: defineAction({
    input: z.object({
      companyName: z.string().trim().min(1).max(180),
      industry: z.string().max(180).optional(),
      location: z.string().max(220).optional(),
      websiteUrl: z.string().max(900).optional(),
      googleMapsUrl: z.string().max(900).optional(),
      contactName: z.string().max(180).optional(),
      contactEmail: z.union([z.string().email(), z.literal("")]).optional(),
      contactPhone: z.string().max(80).optional(),
      source: z.string().max(120).optional(),
      notes: z.string().max(4000).optional(),
    }),
    async handler(input, context) {
      const { supabase, user } = await authenticated(context);
      const { data, error } = await supabase
        .from("leads")
        .insert({
          owner_id: user.id,
          company_name: input.companyName,
          industry: nullable(input.industry),
          location: nullable(input.location),
          website_url: nullable(input.websiteUrl),
          google_maps_url: nullable(input.googleMapsUrl),
          contact_name: nullable(input.contactName),
          contact_email: nullable(input.contactEmail),
          contact_phone: nullable(input.contactPhone),
          source: nullable(input.source),
          notes: nullable(input.notes),
        })
        .select("id")
        .single();
      if (error) fail(`Der Lead konnte nicht angelegt werden: ${error.message}`);
      return { id: data.id as number };
    },
  }),

  updateLead: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      companyName: z.string().trim().min(1).max(180),
      industry: z.string().max(180).optional(),
      location: z.string().max(220).optional(),
      websiteUrl: z.string().max(900).optional(),
      googleMapsUrl: z.string().max(900).optional(),
      googlePlaceId: z.string().max(220).optional(),
      contactName: z.string().max(180).optional(),
      contactEmail: z.union([z.string().email(), z.literal("")]).optional(),
      contactPhone: z.string().max(80).optional(),
      source: z.string().max(120).optional(),
      priority: z.enum(priorities),
      status: z.enum(leadStatuses),
      nextAction: z.string().max(500).optional(),
      nextActionAt: z.string().optional(),
      notes: z.string().max(4000).optional(),
    }),
    async handler(input, context) {
      assertLeadFollowUp(input.status as LeadStatus, input.nextAction, input.nextActionAt);
      const { supabase } = await authenticated(context);
      const { error } = await supabase
        .from("leads")
        .update({
          company_name: input.companyName,
          industry: nullable(input.industry),
          location: nullable(input.location),
          website_url: nullable(input.websiteUrl),
          google_maps_url: nullable(input.googleMapsUrl),
          google_place_id: nullable(input.googlePlaceId),
          contact_name: nullable(input.contactName),
          contact_email: nullable(input.contactEmail),
          contact_phone: nullable(input.contactPhone),
          source: nullable(input.source),
          priority: input.priority,
          priority_overridden: true,
          status: input.status,
          next_action: nullable(input.nextAction),
          next_action_at: nullable(input.nextActionAt),
          notes: nullable(input.notes),
        })
        .eq("id", input.id);
      if (error) fail(`Der Lead konnte nicht gespeichert werden: ${error.message}`);
      return { id: input.id };
    },
  }),

  archiveLead: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    async handler({ id }, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase.from("leads").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) fail(`Der Lead konnte nicht archiviert werden: ${error.message}`);
      return { ok: true };
    },
  }),

  startAudit: defineAction({
    input: z.object({ leadId: z.number().int().positive() }),
    async handler({ leadId }, context) {
      const { supabase, user } = await authenticated(context);
      const { data: existing } = await supabase
        .from("audits")
        .select("id")
        .eq("lead_id", leadId)
        .eq("status", "entwurf")
        .maybeSingle();
      if (existing) return { id: existing.id as number };

      const { data: latest } = await supabase
        .from("audits")
        .select("version")
        .eq("lead_id", leadId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data, error } = await supabase
        .from("audits")
        .insert({
          owner_id: user.id,
          lead_id: leadId,
          version: (latest?.version || 0) + 1,
        })
        .select("id")
        .single();
      if (error) fail(`Der Audit konnte nicht gestartet werden: ${error.message}`);
      await supabase.from("leads").update({ status: "audit_offen" }).eq("id", leadId);
      return { id: data.id as number };
    },
  }),

  saveAudit: defineAction({
    input: z.object({
      auditId: z.number().int().positive(),
      answers: z.array(
        z.object({
          criterionKey: z.string(),
          rating: z.number().int().min(0).max(3),
          note: z.string().max(1000).optional(),
        }),
      ),
      googleSnapshot: z.record(z.string(), z.unknown()).optional(),
      complete: z.boolean(),
    }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { data: audit, error: auditError } = await supabase
        .from("audits")
        .select("id, lead_id, status")
        .eq("id", input.auditId)
        .single();
      if (auditError || !audit) fail("Der Audit wurde nicht gefunden.", "NOT_FOUND");
      if (audit.status === "abgeschlossen") fail("Ein abgeschlossener Audit kann nicht mehr verändert werden.");

      const valid = new Map(auditCriteria.map((criterion) => [criterion.key, criterion]));
      const uniqueAnswers = new Map<string, AuditAnswerInput>();
      for (const answer of input.answers) {
        if (valid.has(answer.criterionKey)) {
          uniqueAnswers.set(answer.criterionKey, {
            criterionKey: answer.criterionKey,
            rating: answer.rating as 0 | 1 | 2 | 3,
            note: nullable(answer.note) || undefined,
          });
        }
      }
      if (input.complete && uniqueAnswers.size !== auditCriteria.length) {
        fail("Bitte bewerten Sie alle Audit-Kriterien, bevor Sie den Audit abschließen.");
      }

      const rows = [...uniqueAnswers.values()].map((answer) => {
        const criterion = valid.get(answer.criterionKey)!;
        return {
          audit_id: input.auditId,
          criterion_key: criterion.key,
          category_key: criterion.category,
          label_snapshot: criterion.label,
          weight_snapshot: criterion.weight,
          rating: answer.rating,
          note: nullable(answer.note),
        };
      });
      if (rows.length) {
        const { error } = await supabase.from("audit_answers").upsert(rows, { onConflict: "audit_id,criterion_key" });
        if (error) fail(`Die Bewertungen konnten nicht gespeichert werden: ${error.message}`);
      }

      const answers = [...uniqueAnswers.values()];
      const score = calculateAuditScore(answers);
      const band = auditBand(score);
      const recommendations = recommendationsFromAnswers(answers);

      await supabase.from("audit_recommendations").delete().eq("audit_id", input.auditId);
      if (recommendations.length) {
        const { error } = await supabase.from("audit_recommendations").insert(
          recommendations.map((recommendation) => ({
            audit_id: input.auditId,
            catalog_item_id: recommendation.catalogItemId,
            catalog_item_name: recommendation.catalogItemName,
            reason: recommendation.reason,
            priority: recommendation.priority,
            selected: recommendation.selected,
          })),
        );
        if (error) fail(`Die Empfehlungen konnten nicht gespeichert werden: ${error.message}`);
      }

      const completedAt = input.complete ? new Date().toISOString() : null;
      const { error: updateError } = await supabase
        .from("audits")
        .update({
          google_snapshot: input.googleSnapshot || {},
          // Ein Entwurf bekommt keinen Score: er rechnet nur über die bereits
          // beantworteten Kriterien und wäre in Listen ein irreführendes Urteil.
          score: input.complete ? score : null,
          band: input.complete ? band : null,
          status: input.complete ? "abgeschlossen" : "entwurf",
          completed_at: completedAt,
        })
        .eq("id", input.auditId);
      if (updateError) fail(`Der Audit konnte nicht gespeichert werden: ${updateError.message}`);

      if (input.complete) {
        const { data: lead } = await supabase
          .from("leads")
          .select("priority_overridden")
          .eq("id", audit.lead_id)
          .single();
        const leadUpdate: Record<string, unknown> = { status: "priorisiert" };
        if (!lead?.priority_overridden) leadUpdate.priority = priorityFromScore(score);
        await supabase.from("leads").update(leadUpdate).eq("id", audit.lead_id);
      }
      return { id: input.auditId, score, band };
    },
  }),

  setRecommendationSelection: defineAction({
    input: z.object({ id: z.number().int().positive(), selected: z.boolean() }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase
        .from("audit_recommendations")
        .update({ selected: input.selected })
        .eq("id", input.id);
      if (error) fail(`Die Empfehlung konnte nicht geändert werden: ${error.message}`);
      return { ok: true };
    },
  }),

  createOffer: defineAction({
    input: z.object({
      leadId: z.number().int().positive(),
      auditId: z.number().int().positive().nullable().optional(),
      offerId: z.string().nullable().optional(),
      addonIds: z.array(z.string()).default([]),
      goal: z.string().trim().min(1).max(1600),
      nextSteps: z.string().max(1600).optional(),
      recipientName: z.string().max(180).optional(),
      recipientCompany: z.string().trim().min(1).max(180),
      recipientAddress: z.string().max(500).optional(),
      validUntil: z.string(),
    }),
    async handler(input, context) {
      const { supabase, user } = await authenticated(context);
      let items;
      try {
        items = buildOfferItems(input.offerId || null, input.addonIds);
      } catch (error) {
        fail(error instanceof Error ? error.message : "Die Leistungsauswahl ist ungültig.");
      }
      const totals = calculateOfferTotals(items);
      const { data: offer, error } = await supabase
        .from("offers")
        .insert({
          owner_id: user.id,
          lead_id: input.leadId,
          audit_id: input.auditId || null,
          recipient_name: nullable(input.recipientName),
          recipient_company: input.recipientCompany,
          recipient_address: nullable(input.recipientAddress),
          goal: input.goal,
          next_steps: nullable(input.nextSteps),
          valid_until: input.validUntil,
          once_total: totals.once,
          monthly_total: totals.monthly,
        })
        .select("id")
        .single();
      if (error) fail(`Das Angebot konnte nicht angelegt werden: ${error.message}`);

      const { error: itemError } = await supabase.from("offer_items").insert(
        items.map((item) => ({
          offer_id: offer.id,
          catalog_item_id: item.catalogItemId,
          name_snapshot: item.name,
          description_snapshot: item.description,
          interval: item.interval,
          unit_price: item.unitPrice,
          price_label_snapshot: item.priceLabel,
          quantity: item.quantity,
          period_snapshot: item.period,
          sort_order: item.sortOrder,
        })),
      );
      if (itemError) {
        await supabase.from("offers").delete().eq("id", offer.id);
        fail(`Die Leistungspositionen konnten nicht gespeichert werden: ${itemError.message}`);
      }
      return { id: offer.id as number };
    },
  }),

  updateOffer: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      offerId: z.string().nullable().optional(),
      addonIds: z.array(z.string()).default([]),
      goal: z.string().trim().min(1).max(1600),
      nextSteps: z.string().max(1600).optional(),
      recipientName: z.string().max(180).optional(),
      recipientCompany: z.string().trim().min(1).max(180),
      recipientAddress: z.string().max(500).optional(),
      validUntil: z.string(),
    }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const existing = await ensureOfferEditable(supabase, input.id);

      let items;
      try {
        items = buildOfferItems(input.offerId || null, input.addonIds);
      } catch (error) {
        fail(error instanceof Error ? error.message : "Die Leistungsauswahl ist ungültig.");
      }
      const totals = calculateOfferTotals(items);

      // Liegt schon ein PDF vor, wird es durch die Änderung ungültig: sonst zeigte
      // dieselbe Angebotsnummer plötzlich andere Zahlen. Zurück auf Entwurf, das
      // nächste PDF trägt dieselbe Nummer mit erhöhter Revision.
      const invalidatesPdf = existing.status === "erstellt";

      const { error } = await supabase
        .from("offers")
        .update({
          recipient_name: nullable(input.recipientName),
          recipient_company: input.recipientCompany,
          recipient_address: nullable(input.recipientAddress),
          goal: input.goal,
          next_steps: nullable(input.nextSteps),
          valid_until: input.validUntil,
          once_total: totals.once,
          monthly_total: totals.monthly,
          ...(invalidatesPdf ? { status: "entwurf", snapshot: null, pdf_path: null, generated_at: null } : {}),
        })
        .eq("id", input.id);
      if (error) fail(`Das Angebot konnte nicht gespeichert werden: ${error.message}`);

      const { error: deleteError } = await supabase.from("offer_items").delete().eq("offer_id", input.id);
      if (deleteError) fail(`Die alten Leistungspositionen konnten nicht ersetzt werden: ${deleteError.message}`);

      const { error: itemError } = await supabase.from("offer_items").insert(
        items.map((item) => ({
          offer_id: input.id,
          catalog_item_id: item.catalogItemId,
          name_snapshot: item.name,
          description_snapshot: item.description,
          interval: item.interval,
          unit_price: item.unitPrice,
          price_label_snapshot: item.priceLabel,
          quantity: item.quantity,
          period_snapshot: item.period,
          sort_order: item.sortOrder,
        })),
      );
      if (itemError) fail(`Die Leistungspositionen konnten nicht gespeichert werden: ${itemError.message}`);

      return { id: input.id, pdfInvalidated: invalidatesPdf };
    },
  }),

  setOfferArchived: defineAction({
    input: z.object({ id: z.number().int().positive(), value: z.boolean() }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { data: offer, error } = await supabase
        .from("offers")
        .select("id, status")
        .eq("id", input.id)
        .single();
      if (error || !offer) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");
      if (input.value && !canArchiveOffer(offer.status as OfferStatus)) {
        fail("Entwürfe werden nicht archiviert, sondern gelöscht.");
      }

      const { error: updateError } = await supabase
        .from("offers")
        .update({ archived_at: input.value ? new Date().toISOString() : null })
        .eq("id", input.id);
      if (updateError) fail(`Das Angebot konnte nicht archiviert werden: ${updateError.message}`);
      return { ok: true };
    },
  }),

  deleteOffer: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    async handler({ id }, context) {
      const { supabase, user } = await authenticated(context);
      const { data: offer, error } = await supabase
        .from("offers")
        .select("id, status, archived_at")
        .eq("id", id)
        .single();
      if (error || !offer) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");

      // Vorher prüfen, damit die Meldung verständlich ist statt eines Fremdschlüsselfehlers.
      if (await offerHasProject(supabase, id)) {
        fail("Zu diesem Angebot gehört ein Kundenprojekt. Lösen Sie zuerst das Projekt.");
      }
      if (!canDeleteOffer(offer.status as OfferStatus, false, offer.archived_at)) {
        fail("Versendete Angebote lassen sich erst aus dem Archiv heraus endgültig löschen.");
      }

      // PDFs zuerst wegräumen, sonst bleiben verwaiste Dateien im Speicher liegen.
      const folder = `${user.id}/offers/${id}`;
      const { data: files } = await supabase.storage.from("offers").list(folder);
      if (files?.length) {
        await supabase.storage.from("offers").remove(files.map((file: { name: string }) => `${folder}/${file.name}`));
      }

      const { error: deleteError } = await supabase.from("offers").delete().eq("id", id);
      if (deleteError) fail(`Das Angebot konnte nicht gelöscht werden: ${deleteError.message}`);
      return { ok: true };
    },
  }),

  updateOfferStatus: defineAction({
    input: z.object({ id: z.number().int().positive(), status: z.enum(offerStatuses) }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { data: offer, error } = await supabase
        .from("offers")
        .select("id, lead_id, status, offer_number")
        .eq("id", input.id)
        .single();
      if (error || !offer) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");

      if (!canTransitionOffer(offer.status as OfferStatus, input.status as OfferStatus)) {
        fail("Dieser Statuswechsel ist nicht zulässig.");
      }
      if (input.status === "erstellt" && !offer.offer_number) {
        fail("Erzeugen Sie zuerst das Angebots-PDF.");
      }

      const patch: Record<string, unknown> = { status: input.status };
      if (input.status === "versendet") patch.sent_at = new Date().toISOString();
      if (input.status === "angenommen") patch.accepted_at = new Date().toISOString();
      const { error: updateError } = await supabase.from("offers").update(patch).eq("id", input.id);
      if (updateError) fail(`Der Status konnte nicht geändert werden: ${updateError.message}`);

      if (input.status === "versendet") {
        await supabase.from("leads").update({ status: "angebot" }).eq("id", offer.lead_id);
      }
      if (input.status === "angenommen") {
        await supabase.from("leads").update({ status: "gewonnen", next_action: null, next_action_at: null }).eq("id", offer.lead_id);
      }
      return { ok: true };
    },
  }),

  duplicateOffer: defineAction({
    input: z.object({ id: z.number().int().positive() }),
    async handler({ id }, context) {
      const { supabase, user } = await authenticated(context);
      const [{ data: offer, error }, { data: items }] = await Promise.all([
        supabase.from("offers").select("*").eq("id", id).single(),
        supabase.from("offer_items").select("*").eq("offer_id", id).order("sort_order"),
      ]);
      if (error || !offer) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");
      const { data: copy, error: copyError } = await supabase
        .from("offers")
        .insert({
          owner_id: user.id,
          lead_id: offer.lead_id,
          audit_id: offer.audit_id,
          recipient_name: offer.recipient_name,
          recipient_company: offer.recipient_company,
          recipient_address: offer.recipient_address,
          goal: offer.goal,
          next_steps: offer.next_steps,
          valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          once_total: offer.once_total,
          monthly_total: offer.monthly_total,
        })
        .select("id")
        .single();
      if (copyError) fail(`Das Angebot konnte nicht dupliziert werden: ${copyError.message}`);
      if (items?.length) {
        await supabase.from("offer_items").insert(
          items.map((item: any) => ({
            offer_id: copy.id,
            catalog_item_id: item.catalog_item_id,
            name_snapshot: item.name_snapshot,
            description_snapshot: item.description_snapshot,
            interval: item.interval,
            unit_price: item.unit_price,
            price_label_snapshot: item.price_label_snapshot,
            quantity: item.quantity,
            period_snapshot: item.period_snapshot,
            sort_order: item.sort_order,
          })),
        );
      }
      return { id: copy.id as number };
    },
  }),

  convertOfferToProject: defineAction({
    input: z.object({ offerId: z.number().int().positive() }),
    async handler({ offerId }, context) {
      const { supabase, user } = await authenticated(context);
      const { data: existing } = await supabase.from("projects").select("id").eq("offer_id", offerId).maybeSingle();
      if (existing) return { id: existing.id as number };

      const [{ data: offer, error }, { data: items }] = await Promise.all([
        supabase
          .from("offers")
          .select("id, lead_id, audit_id, recipient_company, status")
          .eq("id", offerId)
          .single(),
        supabase.from("offer_items").select("*").eq("offer_id", offerId).order("sort_order"),
      ]);
      if (error || !offer) fail("Das Angebot wurde nicht gefunden.", "NOT_FOUND");
      if (!canConvertOfferToProject(offer.status as OfferStatus)) fail("Nur ein angenommenes Angebot kann in ein Projekt umgewandelt werden.");

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          lead_id: offer.lead_id,
          offer_id: offer.id,
          audit_id: offer.audit_id,
          name: offer.recipient_company,
          start_date: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (projectError) fail(`Das Projekt konnte nicht angelegt werden: ${projectError.message}`);
      if (items?.length) {
        const tasks = items.flatMap((item: any, index: number) => {
          const scopes = String(item.description_snapshot || "")
            .split(" · ")
            .map((entry) => entry.trim())
            .filter(Boolean);
          return (scopes.length ? scopes : [item.name_snapshot]).map((title, scopeIndex) => ({
            project_id: project.id,
            title,
            priority: "mittel",
            sort_order: index * 10 + scopeIndex,
          }));
        });
        const { error: taskError } = await supabase.from("project_tasks").insert(tasks);
        if (taskError) fail(`Das Projekt wurde erstellt, aber die Startaufgaben fehlen: ${taskError.message}`);
      }
      return { id: project.id as number };
    },
  }),

  updateProject: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      status: z.enum(projectStatuses),
      targetDate: z.string().optional(),
      notes: z.string().max(4000).optional(),
    }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase
        .from("projects")
        .update({
          status: input.status as ProjectStatus,
          target_date: nullable(input.targetDate),
          notes: nullable(input.notes),
        })
        .eq("id", input.id);
      if (error) fail(`Das Projekt konnte nicht gespeichert werden: ${error.message}`);
      return { ok: true };
    },
  }),

  createTask: defineAction({
    input: z.object({
      projectId: z.number().int().positive(),
      title: z.string().trim().min(1).max(220),
      priority: z.enum(priorities),
      dueAt: z.string().optional(),
    }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase.from("project_tasks").insert({
        project_id: input.projectId,
        title: input.title,
        priority: input.priority as LeadPriority,
        due_at: nullable(input.dueAt),
      });
      if (error) fail(`Die Aufgabe konnte nicht angelegt werden: ${error.message}`);
      return { ok: true };
    },
  }),

  toggleTask: defineAction({
    input: z.object({ id: z.number().int().positive(), done: z.boolean() }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase
        .from("project_tasks")
        .update({
          status: input.done ? "erledigt" : "offen",
          completed_at: input.done ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) fail(`Die Aufgabe konnte nicht aktualisiert werden: ${error.message}`);
      return { ok: true };
    },
  }),

  scheduleCall: defineAction({
    input: z.object({
      leadId: z.number().int().positive(),
      scheduledAt: z.string().trim().min(1, "Bitte wählen Sie einen Termin für den Anruf."),
      note: z.string().max(2000).optional(),
    }),
    async handler(input, context) {
      const { supabase, user } = await authenticated(context);
      const lead = await loadCallLead(supabase, input.leadId);
      if (lead.do_not_call) fail("Dieser Kontakt möchte nicht mehr angerufen werden.");

      const { data: open } = await supabase
        .from("lead_calls")
        .select("id")
        .eq("lead_id", input.leadId)
        .eq("state", "geplant")
        .maybeSingle();
      if (open) fail("Für diesen Lead ist bereits ein Anruf geplant.");

      const { data, error } = await supabase
        .from("lead_calls")
        .insert({
          owner_id: user.id,
          lead_id: input.leadId,
          state: "geplant",
          scheduled_at: input.scheduledAt,
          phone: lead.contact_phone,
          note: nullable(input.note),
        })
        .select("id")
        .single();
      if (error) fail(`Der Anruf konnte nicht geplant werden: ${error.message}`);
      return { id: data.id as number };
    },
  }),

  logCall: defineAction({
    input: z.object({
      callId: z.number().int().positive(),
      outcome: z.enum(callOutcomeValues),
      note: z.string().max(2000).optional(),
      followUpAt: z.string().optional(),
      applyLeadStatus: z.boolean().default(true),
      markDoNotCall: z.boolean().default(false),
    }),
    async handler(input, context) {
      const { supabase, user } = await authenticated(context);
      const outcome = input.outcome as CallOutcome;
      const followUpAt = nullable(input.followUpAt);

      const { data: call, error: callError } = await supabase
        .from("lead_calls")
        .select("id, lead_id, state, phone")
        .eq("id", input.callId)
        .single();
      if (callError || !call) fail("Der Anruf wurde nicht gefunden.", "NOT_FOUND");
      if (!canLogOutcome(call.state)) {
        fail("Für diesen Anruf ist bereits ein Ergebnis erfasst. Planen Sie für eine Korrektur einen neuen Anruf.");
      }
      if (requiresFollowUp(outcome) && !followUpAt) {
        fail("Ein vereinbarter Rückruf braucht einen neuen Termin.");
      }

      const lead = await loadCallLead(supabase, call.lead_id);

      const { error } = await supabase
        .from("lead_calls")
        .update({
          state: "erledigt",
          outcome,
          called_at: new Date().toISOString(),
          phone: call.phone || lead.contact_phone,
          note: nullable(input.note),
        })
        .eq("id", call.id);
      if (error) fail(`Das Anrufergebnis konnte nicht gespeichert werden: ${error.message}`);

      let followUpCallId: number | null = null;
      if (requiresFollowUp(outcome) && followUpAt && !input.markDoNotCall) {
        const { data: followUp, error: followUpError } = await supabase
          .from("lead_calls")
          .insert({
            owner_id: user.id,
            lead_id: call.lead_id,
            state: "geplant",
            scheduled_at: followUpAt,
            phone: lead.contact_phone,
          })
          .select("id")
          .single();
        if (followUpError) {
          fail(`Das Ergebnis ist gespeichert, der Folgetermin nicht: ${followUpError.message}`);
        }
        followUpCallId = followUp.id as number;
        await supabase.from("lead_calls").update({ rescheduled_to_id: followUpCallId }).eq("id", call.id);
      }

      const leadUpdate: Record<string, unknown> = {};
      let notice: string | null = null;

      if (input.markDoNotCall) {
        leadUpdate.do_not_call = true;
        leadUpdate.do_not_call_at = new Date().toISOString();
        await supabase
          .from("lead_calls")
          .update({ state: "abgesagt" })
          .eq("lead_id", call.lead_id)
          .eq("state", "geplant");
      }

      const suggestion = suggestLeadStatus(outcome, lead.status);
      if (input.applyLeadStatus && suggestion) {
        // Aktive Status verlangen laut assertLeadFollowUp einen nächsten Schritt mit Datum.
        // Ohne den würde der Lead in einen Zustand geraten, den das Lead-Formular nicht mehr speichern kann.
        if (leadStatusRequiresFollowUp(suggestion) && !lead.next_action_at && !followUpAt) {
          notice = "Der Status blieb unverändert, weil dafür ein nächster Schritt mit Termin nötig ist.";
        } else {
          leadUpdate.status = suggestion;
          if (leadStatusRequiresFollowUp(suggestion) && !lead.next_action_at && followUpAt) {
            leadUpdate.next_action = "Anruf";
            leadUpdate.next_action_at = followUpAt;
          }
        }
      }

      if (Object.keys(leadUpdate).length) {
        const { error: leadError } = await supabase.from("leads").update(leadUpdate).eq("id", call.lead_id);
        if (leadError) fail(`Das Ergebnis ist gespeichert, der Lead nicht: ${leadError.message}`);
      }

      return {
        ok: true,
        followUpCallId,
        statusApplied: Boolean(leadUpdate.status),
        notice,
      };
    },
  }),

  cancelCall: defineAction({
    input: z.object({ callId: z.number().int().positive() }),
    async handler({ callId }, context) {
      const { supabase } = await authenticated(context);
      const { data, error } = await supabase
        .from("lead_calls")
        .update({ state: "abgesagt" })
        .eq("id", callId)
        .eq("state", "geplant")
        .select("id")
        .maybeSingle();
      if (error) fail(`Der Anruf konnte nicht abgesagt werden: ${error.message}`);
      if (!data) fail("Nur ein geplanter Anruf lässt sich absagen.");
      return { ok: true };
    },
  }),

  setDoNotCall: defineAction({
    input: z.object({ leadId: z.number().int().positive(), value: z.boolean() }),
    async handler(input, context) {
      const { supabase } = await authenticated(context);
      const { error } = await supabase
        .from("leads")
        .update({
          do_not_call: input.value,
          do_not_call_at: input.value ? new Date().toISOString() : null,
        })
        .eq("id", input.leadId);
      if (error) fail(`Die Anrufsperre konnte nicht gesetzt werden: ${error.message}`);
      if (input.value) {
        await supabase
          .from("lead_calls")
          .update({ state: "abgesagt" })
          .eq("lead_id", input.leadId)
          .eq("state", "geplant");
      }
      return { ok: true };
    },
  }),

  saveSettings: defineAction({
    input: z.object({
      displayName: z.string().trim().min(1).max(180),
      legalName: z.string().max(220).optional(),
      address: z.string().max(500).optional(),
      email: z.union([z.string().email(), z.literal("")]).optional(),
      phone: z.string().max(80).optional(),
      taxId: z.string().max(120).optional(),
      vatNote: z.string().trim().min(1).max(300),
      offerDisclaimer: z.string().trim().min(1).max(1200),
      defaultValidityDays: z.number().int().min(1).max(90),
    }),
    async handler(input, context) {
      const { supabase, user } = await authenticated(context);
      const { error } = await supabase.from("workspace_settings").upsert({
        owner_id: user.id,
        display_name: input.displayName,
        legal_name: nullable(input.legalName),
        address: nullable(input.address),
        email: nullable(input.email),
        phone: nullable(input.phone),
        tax_id: nullable(input.taxId),
        vat_note: input.vatNote,
        offer_disclaimer: input.offerDisclaimer,
        default_validity_days: input.defaultValidityDays,
      });
      if (error) fail(`Die Einstellungen konnten nicht gespeichert werden: ${error.message}`);
      return { ok: true };
    },
  }),
};
