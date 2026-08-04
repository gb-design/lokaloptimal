import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { DashboardCheckbox, DashboardDateField } from "./FormControls";
import { callOutcomes, requiresFollowUp, suggestLeadStatus } from "../../lib/dashboard/calls";
import { callOutcomeLabels, leadStatusLabels, type CallOutcome, type LeadStatus } from "../../lib/dashboard/types";
import { resultMessage } from "./action-utils";

const outcomeHints: Record<CallOutcome, string> = {
  gespraech: "Erreicht und inhaltlich gesprochen.",
  rueckruf: "Neuer Termin vereinbart. Folgeanruf wird angelegt.",
  nicht_erreicht: "Niemand erreicht oder auf der Mailbox gelandet.",
  kein_interesse: "Absage. Der Lead bleibt wiedervorlagefähig.",
  falsche_nummer: "Nummer stimmt nicht. Kontaktdaten prüfen.",
};

/** Lokale Eingabe in ein absolutes Datum umrechnen, damit die Fälligkeit zur Zeitzone passt. */
function toIsoOrNull(localValue: string) {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function defaultFollowUp(daysAhead = 7) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(9, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CallOutcomeForm({
  callId,
  companyName,
  leadStatus,
  onDone,
}: {
  callId: number;
  companyName: string;
  leadStatus: LeadStatus;
  onDone?: () => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome>("nicht_erreicht");
  const [note, setNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState(defaultFollowUp());
  const [applyLeadStatus, setApplyLeadStatus] = useState(true);
  const [markDoNotCall, setMarkDoNotCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsFollowUp = requiresFollowUp(outcome);
  const suggestion = suggestLeadStatus(outcome, leadStatus);
  const showDoNotCall = outcome === "kein_interesse";

  function pick(next: CallOutcome) {
    setOutcome(next);
    if (next !== "kein_interesse") setMarkDoNotCall(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const followUpIso = toIsoOrNull(followUpAt);
    if (needsFollowUp && !followUpIso) {
      setError("Ein vereinbarter Rückruf braucht einen neuen Termin.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await actions.logCall({
      callId,
      outcome,
      note,
      followUpAt: needsFollowUp && followUpIso ? followUpIso : undefined,
      applyLeadStatus,
      markDoNotCall,
    });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    onDone ? onDone() : window.location.reload();
  }

  return (
    <form className="dash-form dash-call-form" onSubmit={submit}>
      <fieldset className="dash-field wide">
        <legend>Ergebnis für {companyName}</legend>
        <div className="dash-radio-grid">
          {callOutcomes.map((value) => (
            <label className="dash-radio" key={value} data-active={String(value === outcome)}>
              <input
                type="radio"
                name={`outcome-${callId}`}
                value={value}
                checked={value === outcome}
                onChange={() => pick(value)}
              />
              <span>
                <strong>{callOutcomeLabels[value]}</strong>
                <small>{outcomeHints[value]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="dash-field wide">
        <label htmlFor={`call-note-${callId}`}>Notiz</label>
        <textarea
          id={`call-note-${callId}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Was wurde besprochen, was ist der Anlass für den nächsten Kontakt?"
        />
      </div>

      {needsFollowUp && (
        <DashboardDateField
          id={`call-followup-${callId}`}
          label="Nächster Anruf"
          value={followUpAt}
          includeTime
          required
          onChange={setFollowUpAt}
        />
      )}

      <div className="dash-choices">
        {suggestion && (
          <DashboardCheckbox isSelected={applyLeadStatus} onChange={setApplyLeadStatus}>
            Lead-Status auf „{leadStatusLabels[suggestion]}" setzen
          </DashboardCheckbox>
        )}
        {showDoNotCall && (
          <DashboardCheckbox isSelected={markDoNotCall} onChange={setMarkDoNotCall}>
            Nie wieder anrufen — Kontakt dauerhaft aus der Anrufliste nehmen
          </DashboardCheckbox>
        )}
      </div>

      {error && (
        <div className="dash-feedback error" role="alert">
          <DashboardIcon name="error" size={18} />
          {error}
        </div>
      )}

      <div className="dash-actions">
        <button className="dash-button" type="submit" disabled={busy}>
          <DashboardIcon name={busy ? "progress_activity" : "check"} size={18} />
          {busy ? "Wird gespeichert…" : "Ergebnis speichern"}
        </button>
        {onDone && (
          <button className="dash-button secondary" type="button" onClick={onDone} disabled={busy}>
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}

export function CallScheduler({
  leadId,
  companyName,
  onDone,
}: {
  leadId: number;
  companyName: string;
  onDone?: () => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(defaultFollowUp(1));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const iso = toIsoOrNull(scheduledAt);
    if (!iso) {
      setError("Bitte wählen Sie einen Termin für den Anruf.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await actions.scheduleCall({ leadId, scheduledAt: iso, note });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    onDone ? onDone() : window.location.reload();
  }

  return (
    <form className="dash-form dash-call-form" onSubmit={submit}>
      <div className="dash-form-grid">
        <DashboardDateField
          id={`schedule-${leadId}`}
          label={`Anruf bei ${companyName}`}
          value={scheduledAt}
          includeTime
          required
          onChange={setScheduledAt}
        />
        <div className="dash-field wide">
          <label htmlFor={`schedule-note-${leadId}`}>Notiz</label>
          <input
            id={`schedule-note-${leadId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Worum geht es beim Anruf?"
          />
        </div>
      </div>

      {error && (
        <div className="dash-feedback error" role="alert">
          <DashboardIcon name="error" size={18} />
          {error}
        </div>
      )}

      <div className="dash-actions">
        <button className="dash-button" type="submit" disabled={busy}>
          <DashboardIcon name={busy ? "progress_activity" : "event_upcoming"} size={18} />
          {busy ? "Wird geplant…" : "Anruf planen"}
        </button>
        {onDone && (
          <button className="dash-button secondary" type="button" onClick={onDone} disabled={busy}>
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
