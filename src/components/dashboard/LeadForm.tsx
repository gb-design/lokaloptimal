import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { DashboardDateField, DashboardSelect } from "./FormControls";
import { leadStatusLabels, priorityLabels, type LeadPriority, type LeadStatus } from "../../lib/dashboard/types";
import { localDateTime, resultMessage } from "./action-utils";

type LeadData = {
  id: number;
  company_name: string;
  industry?: string | null;
  location?: string | null;
  website_url?: string | null;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  source?: string | null;
  priority: LeadPriority;
  status: LeadStatus;
  next_action?: string | null;
  next_action_at?: string | null;
  notes?: string | null;
};

const statuses = Object.keys(leadStatusLabels) as LeadStatus[];
const priorities = Object.keys(priorityLabels) as LeadPriority[];

export function LeadCreateForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = await actions.createLead({
      companyName: data.companyName,
      industry: data.industry,
      location: data.location,
      websiteUrl: data.websiteUrl,
      googleMapsUrl: data.googleMapsUrl,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      source: data.source,
      notes: data.notes,
    });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    window.location.assign(`/dashboard/leads/${result.data.id}`);
  }

  return (
    <form className="dash-form" onSubmit={submit}>
      <div className="dash-form-grid">
        <Field label="Unternehmen" name="companyName" required autoFocus />
        <Field label="Branche" name="industry" />
        <Field label="Standort" name="location" placeholder="Wien, 1070" />
        <Field label="Quelle" name="source" placeholder="Empfehlung, Recherche, Anfrage …" />
        <Field label="Website" name="websiteUrl" type="url" placeholder="https://" />
        <Field label="Google-Maps-Link" name="googleMapsUrl" type="url" placeholder="https://maps.app.goo.gl/…" />
        <Field label="Ansprechpartner" name="contactName" />
        <Field label="E-Mail" name="contactEmail" type="email" />
        <Field label="Telefon" name="contactPhone" type="tel" />
        <div className="dash-field wide">
          <label htmlFor="lead-notes-new">Notizen</label>
          <textarea id="lead-notes-new" name="notes" placeholder="Ausgangslage, Anlass oder erste Beobachtungen" />
        </div>
      </div>
      {error && <Feedback error>{error}</Feedback>}
      <div className="dash-actions">
        <button className="dash-button" type="submit" disabled={busy}>
          <DashboardIcon name={busy ? "progress_activity" : "person_add"} size={18} />
          {busy ? "Lead wird angelegt…" : "Lead anlegen"}
        </button>
        <a className="dash-button secondary" href="/dashboard/leads">Zur Leadliste</a>
      </div>
    </form>
  );
}

export function LeadEditor({ lead }: { lead: LeadData }) {
  const [form, setForm] = useState({
    companyName: lead.company_name,
    industry: lead.industry || "",
    location: lead.location || "",
    websiteUrl: lead.website_url || "",
    googleMapsUrl: lead.google_maps_url || "",
    googlePlaceId: lead.google_place_id || "",
    contactName: lead.contact_name || "",
    contactEmail: lead.contact_email || "",
    contactPhone: lead.contact_phone || "",
    source: lead.source || "",
    priority: lead.priority,
    status: lead.status,
    nextAction: lead.next_action || "",
    nextActionAt: localDateTime(lead.next_action_at),
    notes: lead.notes || "",
  });
  const [busy, setBusy] = useState<"save" | "lookup" | "audit" | "">("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function set(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function lookup() {
    if (!form.googleMapsUrl.trim()) {
      setFeedback({ type: "error", text: "Fügen Sie zuerst den Google-Maps-Link des Unternehmens ein." });
      return;
    }
    setBusy("lookup");
    setFeedback(null);
    try {
      const response = await fetch("/api/internal/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.googleMapsUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setForm((current) => ({
        ...current,
        companyName: payload.found?.name || current.companyName,
        location: payload.found?.address || current.location,
        googlePlaceId: payload.found?.place_id || current.googlePlaceId,
        websiteUrl: payload.details?.website || current.websiteUrl,
        contactPhone: payload.details?.phone || current.contactPhone,
      }));
      setFeedback({ type: "success", text: "Google-Daten wurden übernommen. Bitte prüfen und anschließend speichern." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Google Places war nicht erreichbar." });
    } finally {
      setBusy("");
    }
  }

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy("save");
    setFeedback(null);
    const result = await actions.updateLead({
      id: lead.id,
      ...form,
      priority: form.priority as LeadPriority,
      status: form.status as LeadStatus,
    });
    if (result.error) {
      setFeedback({ type: "error", text: resultMessage(result) });
      setBusy("");
      return false;
    }
    setFeedback({ type: "success", text: "Lead und nächster Schritt sind gespeichert." });
    setBusy("");
    return true;
  }

  async function startAudit() {
    const saved = await save();
    if (!saved) return;
    setBusy("audit");
    const result = await actions.startAudit({ leadId: lead.id });
    if (result.error) {
      setFeedback({ type: "error", text: resultMessage(result) });
      setBusy("");
      return;
    }
    window.location.assign(`/dashboard/audits/${result.data.id}`);
  }

  return (
    <form className="dash-form" onSubmit={save}>
      <div className="dash-form-grid">
        <Field label="Unternehmen" name="companyName" value={form.companyName} onChange={set} required />
        <Field label="Branche" name="industry" value={form.industry} onChange={set} />
        <Field label="Standort" name="location" value={form.location} onChange={set} />
        <Field label="Quelle" name="source" value={form.source} onChange={set} />
        <Field label="Website" name="websiteUrl" type="url" value={form.websiteUrl} onChange={set} />
        <div className="dash-field">
          <label htmlFor="lead-googleMapsUrl">Google-Maps-Link</label>
          <div className="dash-field-row">
            <input id="lead-googleMapsUrl" type="url" value={form.googleMapsUrl} onChange={(event) => set("googleMapsUrl", event.target.value)} />
            <button className="dash-button secondary" type="button" onClick={lookup} disabled={busy === "lookup"}>
              <DashboardIcon name={busy === "lookup" ? "progress_activity" : "travel_explore"} size={18} />
              Prüfen
            </button>
          </div>
        </div>
        <Field label="Ansprechpartner" name="contactName" value={form.contactName} onChange={set} />
        <Field label="E-Mail" name="contactEmail" type="email" value={form.contactEmail} onChange={set} />
        <Field label="Telefon" name="contactPhone" type="tel" value={form.contactPhone} onChange={set} />
        <DashboardSelect
          id="lead-priority"
          label="Priorität"
          value={form.priority}
          options={priorities.map((priority) => ({ value: priority, label: priorityLabels[priority] }))}
          onChange={(value) => set("priority", value)}
        />
        <DashboardSelect
          id="lead-status"
          label="Pipeline-Status"
          value={form.status}
          options={statuses.map((status) => ({ value: status, label: leadStatusLabels[status] }))}
          onChange={(value) => set("status", value)}
        />
        <Field label="Nächster Schritt" name="nextAction" value={form.nextAction} onChange={set} placeholder="z. B. Angebot nachfassen" />
        <DashboardDateField
          id="lead-nextActionAt"
          label="Fällig am"
          value={form.nextActionAt}
          includeTime
          onChange={(value) => set("nextActionAt", value)}
        />
        <div className="dash-field wide">
          <label htmlFor="lead-notes">Notizen</label>
          <textarea id="lead-notes" value={form.notes} onChange={(event) => set("notes", event.target.value)} />
          <small>Keine Passwörter oder Zugangsdaten speichern.</small>
        </div>
      </div>
      {feedback && <Feedback error={feedback.type === "error"} success={feedback.type === "success"}>{feedback.text}</Feedback>}
      <div className="dash-actions">
        <button className="dash-button" type="submit" disabled={Boolean(busy)}>
          <DashboardIcon name={busy === "save" ? "progress_activity" : "save"} size={18} />
          Änderungen speichern
        </button>
        <button className="dash-button secondary" type="button" onClick={startAudit} disabled={Boolean(busy)}>
          <DashboardIcon name="fact_check" size={18} />
          Audit starten
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: {
  label: string;
  name: string;
  type?: string;
  value?: string;
  onChange?: (name: string, value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="dash-field">
      <label htmlFor={`lead-${name}`}>{label}</label>
      <input
        id={`lead-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(name, event.target.value) : undefined}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
      />
    </div>
  );
}

function Feedback({ children, error, success }: { children: React.ReactNode; error?: boolean; success?: boolean }) {
  return (
    <div className={`dash-feedback ${error ? "error" : success ? "success" : ""}`} role={error ? "alert" : "status"}>
      <DashboardIcon name={error ? "error" : success ? "check_circle" : "info"} size={18} />
      {children}
    </div>
  );
}
