import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { resultMessage } from "./action-utils";

type Settings = {
  display_name?: string;
  legal_name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  vat_note?: string;
  offer_disclaimer?: string;
  default_validity_days?: number;
};

export default function SettingsForm({ settings }: { settings?: Settings | null }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = await actions.saveSettings({
      displayName: data.displayName,
      legalName: data.legalName,
      address: data.address,
      email: data.email,
      phone: data.phone,
      taxId: data.taxId,
      vatNote: data.vatNote,
      offerDisclaimer: data.offerDisclaimer,
      defaultValidityDays: Number(data.defaultValidityDays),
    });
    if (result.error) {
      setFeedback({ type: "error", text: resultMessage(result) });
      setBusy(false);
      return;
    }
    setFeedback({ type: "success", text: "Absender- und Angebotsdaten sind gespeichert." });
    setBusy(false);
  }

  return (
    <form className="dash-panel dash-form" onSubmit={submit}>
      <div className="dash-panel-head">
        <div>
          <h2>Absenderdaten</h2>
          <p>Firmenname, Adresse und E-Mail sind für PDF-Angebote erforderlich.</p>
        </div>
      </div>
      <div className="dash-form-grid">
        <Field label="Anzeigename" name="displayName" value={settings?.display_name || "LokalOptimal"} required />
        <Field label="Rechtlicher Firmenname" name="legalName" value={settings?.legal_name || ""} required />
        <Field label="E-Mail" name="email" value={settings?.email || ""} type="email" required />
        <Field label="Telefon" name="phone" value={settings?.phone || ""} />
        <Field label="Steuer-/UID-Nummer" name="taxId" value={settings?.tax_id || ""} />
        <Field label="Standardgültigkeit in Tagen" name="defaultValidityDays" value={String(settings?.default_validity_days || 14)} type="number" required />
        <div className="dash-field wide">
          <label htmlFor="settings-address">Geschäftsadresse</label>
          <textarea id="settings-address" name="address" defaultValue={settings?.address || ""} required />
        </div>
        <div className="dash-field wide">
          <label htmlFor="settings-vat">Preis-/USt.-Hinweis</label>
          <input id="settings-vat" name="vatNote" defaultValue={settings?.vat_note || "Alle Preise netto, exkl. USt."} required />
        </div>
        <div className="dash-field wide">
          <label htmlFor="settings-disclaimer">Ergebnis-Disclaimer</label>
          <textarea
            id="settings-disclaimer"
            name="offerDisclaimer"
            defaultValue={settings?.offer_disclaimer || "Die beschriebenen Ziele sind keine Garantie für bestimmte Rankings, Anfragen oder wirtschaftliche Ergebnisse."}
            required
          />
        </div>
      </div>
      {feedback && (
        <div className={`dash-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          <DashboardIcon name={feedback.type === "error" ? "error" : "check_circle"} size={18} />
          {feedback.text}
        </div>
      )}
      <button className="dash-button" type="submit" disabled={busy}>
        <DashboardIcon name={busy ? "progress_activity" : "save"} size={18} />
        Einstellungen speichern
      </button>
    </form>
  );
}

function Field({ label, name, value, type = "text", required }: { label: string; name: string; value: string; type?: string; required?: boolean }) {
  return (
    <div className="dash-field">
      <label htmlFor={`settings-${name}`}>{label}</label>
      <input id={`settings-${name}`} name={name} type={type} defaultValue={value} required={required} min={type === "number" ? 1 : undefined} max={type === "number" ? 90 : undefined} />
    </div>
  );
}
