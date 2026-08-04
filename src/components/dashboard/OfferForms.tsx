import { useMemo, useState } from "react";
import { actions } from "astro:actions";
import { Radio, RadioGroup } from "react-aria-components";
import DashboardIcon from "./DashboardIcon";
import { DashboardCheckbox, DashboardDateField } from "./FormControls";
import {
  addons,
  geoCheck,
  packages,
  qrReviewTrigger,
  retainers,
} from "../../data/pricing";
import { buildOfferItems, calculateOfferTotals, selectionFromItems } from "../../lib/dashboard/offers";
import { offerStatusLabels, type OfferStatus } from "../../lib/dashboard/types";
import { canArchiveOffer, canDeleteOffer, canEditOffer } from "../../lib/dashboard/workflow";
import { money, resultMessage } from "./action-utils";

type LeadOption = {
  id: number;
  company_name: string;
  contact_name?: string | null;
  location?: string | null;
};

type AuditOption = {
  id: number;
  score?: number | null;
  band?: string | null;
  recommendations?: Array<{
    catalog_item_id: string;
    selected: boolean;
  }>;
};

const baseOffers = [...packages, ...retainers];
const allAddons = [...addons, geoCheck, qrReviewTrigger];

export type OfferFormValues = {
  offerId: string;
  addonIds: string[];
  recipientName: string;
  recipientCompany: string;
  recipientAddress: string;
  goal: string;
  nextSteps: string;
  validUntil: string;
};

export type OfferFormPayload = Omit<OfferFormValues, "offerId"> & { offerId: string | null };

/**
 * Gemeinsame Maske für Anlegen und Bearbeiten. Die beiden Wege unterscheiden
 * sich nur in den Startwerten und darin, welche Action beim Speichern läuft.
 */
function OfferForm({
  initial,
  submitLabel,
  busyLabel,
  cancelHref,
  cancelLabel,
  notice,
  onSubmit,
}: {
  initial: OfferFormValues;
  submitLabel: string;
  busyLabel: string;
  cancelHref: string;
  cancelLabel: string;
  notice?: string;
  onSubmit: (payload: OfferFormPayload) => Promise<string | null>;
}) {
  const [offerId, setOfferId] = useState(initial.offerId);
  const [addonIds, setAddonIds] = useState(initial.addonIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validUntil, setValidUntil] = useState(initial.validUntil);

  const items = useMemo(() => {
    try {
      return buildOfferItems(offerId || null, addonIds);
    } catch {
      return [];
    }
  }, [offerId, addonIds]);
  const totals = calculateOfferTotals(items);
  const selectedBase = baseOffers.find((entry) => entry.id === offerId);
  const availableAddons = allAddons.filter((entry) => !selectedBase?.includedAddonIds.includes(entry.id));
  function toggleAddon(id: string) {
    setAddonIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const message = await onSubmit({
      offerId: offerId || null,
      addonIds,
      goal: data.goal,
      nextSteps: data.nextSteps,
      recipientName: data.recipientName,
      recipientCompany: data.recipientCompany,
      recipientAddress: data.recipientAddress,
      validUntil: data.validUntil,
    });
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  const lead = {
    contact_name: initial.recipientName,
    company_name: initial.recipientCompany,
    location: initial.recipientAddress,
  };

  return (
    <form className="dash-form" onSubmit={submit}>
      <div className="dash-detail-grid">
        <div className="dash-stack">
          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>1. Paket wählen</h2>
                <p>Ein Basispaket oder ein reines Add-on-Angebot.</p>
              </div>
            </div>
            <RadioGroup
              className="dash-choice-list"
              aria-label="Basispaket"
              value={offerId}
              onChange={setOfferId}
            >
              <Radio className="dash-choice" value="">
                <span className="dash-choice-control radio" aria-hidden="true"><span /></span>
                <span className="dash-choice-copy">
                  <strong>Kein Basispaket</strong>
                  <small>Für ein Angebot ausschließlich mit Ergänzungen.</small>
                </span>
              </Radio>
              {baseOffers.map((entry) => (
                <Radio className="dash-choice" value={entry.id} key={entry.id}>
                  <span className="dash-choice-control radio" aria-hidden="true"><span /></span>
                  <span className="dash-choice-copy">
                    <strong>{entry.name}</strong>
                    <small>{entry.text}</small>
                  </span>
                  <span className="dash-choice-price">{entry.price} {entry.period}</span>
                </Radio>
              ))}
            </RadioGroup>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>2. Ergänzungen</h2>
                <p>Bereits enthaltene Leistungen werden automatisch ausgeblendet.</p>
              </div>
            </div>
            <div className="dash-choice-list">
              {availableAddons.map((entry) => (
                <DashboardCheckbox
                  isSelected={addonIds.includes(entry.id)}
                  onChange={() => toggleAddon(entry.id)}
                  key={entry.id}
                >
                  <span className="dash-choice-copy">
                    <strong>{entry.name}</strong>
                    <small>{entry.tooltip}</small>
                  </span>
                  <span className="dash-choice-price">{entry.priceValue ? `${entry.price} ${entry.period}` : "auf Anfrage"}</span>
                </DashboardCheckbox>
              ))}
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <div>
                <h2>3. Angebotstext</h2>
                <p>Ziel und nächster Schritt erscheinen im PDF.</p>
              </div>
            </div>
            <div className="dash-form-grid">
              <div className="dash-field">
                <label htmlFor="offer-recipient-name">Ansprechpartner</label>
                <input id="offer-recipient-name" name="recipientName" defaultValue={lead.contact_name || ""} />
              </div>
              <div className="dash-field">
                <label htmlFor="offer-company">Unternehmen</label>
                <input id="offer-company" name="recipientCompany" defaultValue={lead.company_name} required />
              </div>
              <div className="dash-field wide">
                <label htmlFor="offer-address">Empfängeradresse</label>
                <input id="offer-address" name="recipientAddress" defaultValue={lead.location || ""} />
              </div>
              <div className="dash-field wide">
                <label htmlFor="offer-goal">Erwartetes Ziel</label>
                <textarea id="offer-goal" name="goal" required defaultValue={initial.goal} />
              </div>
              <div className="dash-field wide">
                <label htmlFor="offer-next">Nächste Schritte</label>
                <textarea id="offer-next" name="nextSteps" defaultValue={initial.nextSteps} />
              </div>
              <DashboardDateField
                id="offer-valid"
                label="Gültig bis"
                name="validUntil"
                value={validUntil}
                onChange={setValidUntil}
                required
              />
            </div>
          </section>
        </div>

        <aside className="dash-panel" style={{ position: "sticky", top: "1.5rem" }}>
          <div className="dash-panel-head">
            <div>
              <h2>Zusammenfassung</h2>
              <p>{items.length} Leistungspositionen</p>
            </div>
          </div>
          {items.length ? (
            <div className="dash-list">
              {items.map((item) => (
                <div className="dash-list-row compact" key={item.catalogItemId}>
                  <div className="dash-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.period}</small>
                  </div>
                  <strong>{item.priceLabel || money(item.unitPrice)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-empty">
              <DashboardIcon name="playlist_add" size={28} />
              <strong>Noch keine Leistung</strong>
              <p>Wählen Sie ein Paket oder mindestens eine Ergänzung.</p>
            </div>
          )}
          <div className="dash-total">
            {totals.once > 0 && <div className="dash-total-row"><span>Einmalig netto</span><strong>{money(totals.once)}</strong></div>}
            {totals.monthly > 0 && <div className="dash-total-row"><span>Monatlich netto</span><strong>{money(totals.monthly)}</strong></div>}
            <small style={{ color: "var(--dash-muted)", textAlign: "right" }}>Alle Preise exkl. USt.</small>
          </div>
          {notice && (
            <div className="dash-feedback" role="status" style={{ marginTop: "1rem" }}>
              <DashboardIcon name="info" size={18} />
              {notice}
            </div>
          )}
          {error && <div className="dash-feedback error" role="alert" style={{ marginTop: "1rem" }}>{error}</div>}
          <button className="dash-button" type="submit" disabled={busy || !items.length} style={{ width: "100%", marginTop: "1.5rem" }}>
              <DashboardIcon name={busy ? "progress_activity" : "request_quote"} size={18} />
            {busy ? busyLabel : submitLabel}
          </button>
          <a className="dash-button secondary" href={cancelHref} style={{ width: "100%", marginTop: ".75rem", justifyContent: "center" }}>
            {cancelLabel}
          </a>
        </aside>
      </div>
    </form>
  );
}

export function OfferCreateForm({
  lead,
  audit,
}: {
  lead: LeadOption;
  audit?: AuditOption | null;
}) {
  const recommendedIds = (audit?.recommendations || [])
    .filter((entry) => entry.selected)
    .map((entry) => entry.catalog_item_id);

  const initial: OfferFormValues = {
    offerId: baseOffers.find((entry) => recommendedIds.includes(entry.id))?.id || "",
    addonIds: allAddons.filter((entry) => recommendedIds.includes(entry.id)).map((entry) => entry.id),
    recipientName: lead.contact_name || "",
    recipientCompany: lead.company_name,
    recipientAddress: lead.location || "",
    goal:
      audit?.score !== null && audit?.score !== undefined
        ? `Auf Basis des LokalOptimal-Audits mit ${audit.score}/100 Punkten verbessern wir die wichtigsten Schwachstellen systematisch und schaffen eine belastbare Grundlage für mehr lokale Sichtbarkeit und Vertrauen.`
        : "Wir schaffen eine klare, gepflegte Grundlage für mehr lokale Sichtbarkeit und Vertrauen.",
    nextSteps:
      "Nach Ihrer Freigabe stimmen wir den Projektstart und die benötigten Inhalte in einem kurzen Auftakttermin ab.",
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  };

  return (
    <OfferForm
      initial={initial}
      submitLabel="Angebotsentwurf anlegen"
      busyLabel="Entwurf wird angelegt…"
      cancelHref={`/dashboard/leads/${lead.id}`}
      cancelLabel="Abbrechen"
      onSubmit={async (payload) => {
        const result = await actions.createOffer({ leadId: lead.id, auditId: audit?.id || null, ...payload });
        if (result.error) return resultMessage(result);
        window.location.assign(`/dashboard/offers/${result.data.id}`);
        return null;
      }}
    />
  );
}

export function OfferEditForm({
  offer,
  items,
}: {
  offer: {
    id: number;
    status: OfferStatus;
    recipient_name?: string | null;
    recipient_company: string;
    recipient_address?: string | null;
    goal: string;
    next_steps?: string | null;
    valid_until: string;
  };
  items: Array<{ catalog_item_id: string }>;
}) {
  const selection = selectionFromItems(items);
  const initial: OfferFormValues = {
    offerId: selection.offerId || "",
    addonIds: selection.addonIds,
    recipientName: offer.recipient_name || "",
    recipientCompany: offer.recipient_company,
    recipientAddress: offer.recipient_address || "",
    goal: offer.goal,
    nextSteps: offer.next_steps || "",
    validUntil: offer.valid_until.slice(0, 10),
  };

  return (
    <OfferForm
      initial={initial}
      submitLabel="Änderungen speichern"
      busyLabel="Wird gespeichert…"
      cancelHref={`/dashboard/offers/${offer.id}`}
      cancelLabel="Zurück zum Angebot"
      notice={
        offer.status === "erstellt"
          ? "Für dieses Angebot liegt bereits ein PDF vor. Beim Speichern wird es verworfen und das Angebot geht zurück in den Entwurf — erzeugen Sie danach ein neues PDF."
          : undefined
      }
      onSubmit={async (payload) => {
        const result = await actions.updateOffer({ id: offer.id, ...payload });
        if (result.error) return resultMessage(result);
        window.location.assign(`/dashboard/offers/${offer.id}`);
        return null;
      }}
    />
  );
}

export function OfferControls({
  offer,
  project,
}: {
  offer: { id: number; status: OfferStatus; offer_number?: string | null; archived_at?: string | null };
  project?: { id: number } | null;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasProject = Boolean(project);
  const editable = canEditOffer(offer.status);
  const archived = Boolean(offer.archived_at);
  const archivable = canArchiveOffer(offer.status);
  const deletable = canDeleteOffer(offer.status, hasProject, offer.archived_at);

  async function setArchived(value: boolean) {
    setBusy("archive");
    setError("");
    const result = await actions.setOfferArchived({ id: offer.id, value });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    window.location.reload();
  }

  async function remove() {
    setBusy("delete");
    setError("");
    const result = await actions.deleteOffer({ id: offer.id });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      setConfirmDelete(false);
      return;
    }
    window.location.assign("/dashboard/offers");
  }

  async function generatePdf() {
    setBusy("pdf");
    setError("");
    try {
      const response = await fetch(`/api/internal/offers/${offer.id}/pdf`);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        const payload = contentType.includes("json") ? await response.json() : null;
        throw new Error(payload?.error || "Das PDF konnte nicht erzeugt werden.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${offer.offer_number || `Angebot-${offer.id}`}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      window.setTimeout(() => window.location.reload(), 400);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Das PDF konnte nicht erzeugt werden.");
      setBusy("");
    }
  }

  async function setStatus(status: OfferStatus) {
    setBusy(status);
    setError("");
    const result = await actions.updateOfferStatus({ id: offer.id, status });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    window.location.reload();
  }

  async function duplicate() {
    setBusy("duplicate");
    const result = await actions.duplicateOffer({ id: offer.id });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    window.location.assign(`/dashboard/offers/${result.data.id}`);
  }

  async function convert() {
    setBusy("project");
    const result = await actions.convertOfferToProject({ offerId: offer.id });
    if (result.error) {
      setError(resultMessage(result));
      setBusy("");
      return;
    }
    window.location.assign(`/dashboard/projects/${result.data.id}`);
  }

  return (
    <div className="dash-stack">
      <div className="dash-actions">
        {(offer.status === "entwurf" || offer.status === "erstellt") && (
          <button className="dash-button" type="button" onClick={generatePdf} disabled={Boolean(busy)}>
            <DashboardIcon name={busy === "pdf" ? "progress_activity" : "picture_as_pdf"} size={18} />
            {offer.status === "erstellt" ? "PDF erneut erzeugen" : "PDF erzeugen"}
          </button>
        )}
        {offer.status === "erstellt" && (
          <button className="dash-button secondary" type="button" onClick={() => setStatus("versendet")} disabled={Boolean(busy)}>
            <DashboardIcon name="send" size={18} />
            Als versendet markieren
          </button>
        )}
        {offer.status === "versendet" && (
          <>
            <button className="dash-button" type="button" onClick={() => setStatus("angenommen")} disabled={Boolean(busy)}>
              <DashboardIcon name="handshake" size={18} />
              Angenommen
            </button>
            <button className="dash-button secondary" type="button" onClick={() => setStatus("abgelehnt")} disabled={Boolean(busy)}>
              Abgelehnt
            </button>
            <button className="dash-button ghost" type="button" onClick={() => setStatus("abgelaufen")} disabled={Boolean(busy)}>
              Abgelaufen
            </button>
          </>
        )}
        {offer.status === "angenommen" && !project && (
          <button className="dash-button" type="button" onClick={convert} disabled={Boolean(busy)}>
            <DashboardIcon name="rocket_launch" size={18} />
            In Projekt umwandeln
          </button>
        )}
        {project && (
          <a className="dash-button" href={`/dashboard/projects/${project.id}`}>
            <DashboardIcon name="view_kanban" size={18} />
            Projekt öffnen
          </a>
        )}
        {["versendet", "angenommen", "abgelehnt", "abgelaufen"].includes(offer.status) && (
          <>
            <button className="dash-button secondary" type="button" onClick={generatePdf} disabled={Boolean(busy)}>
              <DashboardIcon name="download" size={18} />
              PDF herunterladen
            </button>
            <button className="dash-button ghost" type="button" onClick={duplicate} disabled={Boolean(busy)}>
              <DashboardIcon name="content_copy" size={18} />
              Duplizieren
            </button>
          </>
        )}
      </div>
      <div className="dash-actions">
        {editable && (
          <a className="dash-button secondary" href={`/dashboard/offers/${offer.id}/edit`}>
            <DashboardIcon name="save" size={18} />
            Bearbeiten
          </a>
        )}
        {archivable && !archived && (
          <button className="dash-button ghost" type="button" onClick={() => setArchived(true)} disabled={Boolean(busy)}>
            <DashboardIcon name={busy === "archive" ? "progress_activity" : "visibility_off"} size={18} />
            Archivieren
          </button>
        )}
        {archived && (
          <button className="dash-button secondary" type="button" onClick={() => setArchived(false)} disabled={Boolean(busy)}>
            <DashboardIcon name={busy === "archive" ? "progress_activity" : "arrow_back"} size={18} />
            Aus dem Archiv holen
          </button>
        )}
        {deletable && !confirmDelete && (
          <button className="dash-button danger" type="button" onClick={() => setConfirmDelete(true)} disabled={Boolean(busy)}>
            <DashboardIcon name="block" size={18} />
            Endgültig löschen
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="dash-callout danger" role="alertdialog" aria-label="Löschen bestätigen">
          <DashboardIcon name="error" size={20} weight="bold" />
          <div>
            <strong>Endgültig löschen?</strong>
            <p>
              Das Angebot und alle erzeugten PDFs werden unwiderruflich entfernt.
              {offer.offer_number ? ` Die Nummer ${offer.offer_number} bleibt danach ungenutzt.` : ""}
            </p>
          </div>
          <div className="dash-actions">
            <button className="dash-button danger" type="button" onClick={remove} disabled={busy === "delete"}>
              <DashboardIcon name={busy === "delete" ? "progress_activity" : "block"} size={18} />
              Ja, löschen
            </button>
            <button className="dash-button secondary" type="button" onClick={() => setConfirmDelete(false)} disabled={busy === "delete"}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {hasProject && (
        <p className="dash-cell-muted">
          Zu diesem Angebot gehört ein Kundenprojekt — es lässt sich deshalb nicht löschen.
        </p>
      )}
      {!archived && archivable && !deletable && (
        <p className="dash-cell-muted">
          Versendete Angebote lassen sich erst aus dem Archiv heraus endgültig löschen.
        </p>
      )}

      {error && (
        <div className="dash-feedback error" role="alert">
          <DashboardIcon name="error" size={18} />
          <span>{error} {error.includes("Einstellungen") && <a href="/dashboard/settings" style={{ textDecoration: "underline" }}>Einstellungen öffnen</a>}</span>
        </div>
      )}
      <div className="dash-actions">
        <span className="dash-badge" data-tone={offer.status}>{offerStatusLabels[offer.status]}</span>
        {archived && <span className="dash-badge">Archiviert</span>}
      </div>
    </div>
  );
}
