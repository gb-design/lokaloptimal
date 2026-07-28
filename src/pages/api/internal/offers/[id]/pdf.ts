import type { APIRoute } from "astro";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { OfferPdf, type OfferPdfData } from "../../../../../lib/dashboard/offer-pdf";
import { auditBandLabels, type AuditBand } from "../../../../../lib/dashboard/types";
import { offerNumber } from "../../../../../lib/dashboard/offers";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export const prerender = false;

function dateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("de-AT").format(new Date(value));
}

export const GET: APIRoute = async (context) => {
  const headers = { "Cache-Control": "private, no-store" };
  const id = Number.parseInt(context.params.id || "", 10);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Ungültige Angebots-ID." }, { status: 400, headers });
  }

  const supabase = createSupabaseServerClient(context);
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return Response.json({ error: "Bitte melden Sie sich erneut an." }, { status: 401, headers });

  const [{ data: offer, error: offerError }, { data: items }, { data: settings }] = await Promise.all([
    supabase
      .from("offers")
      .select("*, audit:audits(score, band)")
      .eq("id", id)
      .single(),
    supabase.from("offer_items").select("*").eq("offer_id", id).order("sort_order"),
    supabase.from("workspace_settings").select("*").eq("owner_id", authData.user.id).maybeSingle(),
  ]);

  if (offerError || !offer) return Response.json({ error: "Das Angebot wurde nicht gefunden." }, { status: 404, headers });
  if (!settings?.legal_name || !settings?.address || !settings?.email) {
    return Response.json(
      { error: "Vervollständigen Sie zuerst Firmenname, Adresse und E-Mail in den Einstellungen." },
      { status: 422, headers },
    );
  }

  if (offer.pdf_path && ["versendet", "angenommen", "abgelehnt", "abgelaufen"].includes(offer.status)) {
    const { data, error } = await supabase.storage.from("offers").download(offer.pdf_path);
    if (!error && data) {
      return new Response(await data.arrayBuffer(), {
        headers: {
          ...headers,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${offer.offer_number || `Angebot-${id}`}.pdf"`,
        },
      });
    }
  }

  const generatedAt = new Date();
  const number = offer.offer_number || offerNumber(id, generatedAt);
  const revision = Number(offer.revision || 0) + 1;
  const audit = Array.isArray(offer.audit) ? offer.audit[0] : offer.audit;

  const pdfData: OfferPdfData = {
    offerNumber: number,
    generatedDate: dateLabel(generatedAt),
    validUntil: dateLabel(offer.valid_until),
    sender: {
      displayName: settings.display_name,
      legalName: settings.legal_name,
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
      taxId: settings.tax_id,
      vatNote: settings.vat_note,
      disclaimer: settings.offer_disclaimer,
    },
    recipient: {
      name: offer.recipient_name,
      company: offer.recipient_company,
      address: offer.recipient_address,
    },
    audit:
      audit?.score !== null && audit?.score !== undefined && audit?.band
        ? { score: audit.score, band: auditBandLabels[audit.band as AuditBand] }
        : null,
    goal: offer.goal,
    nextSteps: offer.next_steps,
    items: (items || []).map((item) => ({
      name: item.name_snapshot,
      description: item.description_snapshot,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      priceLabel: item.price_label_snapshot,
      interval: item.interval,
      period: item.period_snapshot,
    })),
    onceTotal: Number(offer.once_total),
    monthlyTotal: Number(offer.monthly_total),
  };

  try {
    const buffer = await renderToBuffer(createElement(OfferPdf, { data: pdfData }) as any);
    const path = `${authData.user.id}/offers/${id}/revision-${revision}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("offers")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      return Response.json({ error: `Das PDF konnte nicht gespeichert werden: ${uploadError.message}` }, { status: 502, headers });
    }

    const snapshot = {
      ...pdfData,
      generatedAt: generatedAt.toISOString(),
      revision,
    };
    const { error: updateError } = await supabase
      .from("offers")
      .update({
        offer_number: number,
        status: "erstellt",
        revision,
        snapshot,
        pdf_path: path,
        generated_at: generatedAt.toISOString(),
      })
      .eq("id", id);
    if (updateError) {
      return Response.json({ error: `Das Angebot konnte nicht aktualisiert werden: ${updateError.message}` }, { status: 502, headers });
    }

    return new Response(buffer, {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[offer-pdf]", error);
    return Response.json({ error: "Das Angebots-PDF konnte nicht erzeugt werden." }, { status: 500, headers });
  }
};
