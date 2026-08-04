import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { CallOutcomeForm, CallScheduler } from "./CallForms";
import {
  callOutcomeLabels,
  callStateLabels,
  type CallOutcome,
  type CallState,
  type LeadStatus,
} from "../../lib/dashboard/types";
import { resultMessage } from "./action-utils";

export type LeadCallRow = {
  id: number;
  state: CallState;
  outcome: CallOutcome | null;
  scheduled_at: string | null;
  called_at: string | null;
  phone: string | null;
  note: string | null;
};

const dateTime = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  dateStyle: "medium",
  timeStyle: "short",
});

function format(value: string | null) {
  return value ? dateTime.format(new Date(value)) : "—";
}

export default function LeadCalls({
  leadId,
  companyName,
  leadStatus,
  doNotCall,
  doNotCallAt,
  calls,
}: {
  leadId: number;
  companyName: string;
  leadStatus: LeadStatus;
  doNotCall: boolean;
  doNotCallAt: string | null;
  calls: LeadCallRow[];
}) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const planned = calls.find((call) => call.state === "geplant") || null;
  const history = calls.filter((call) => call.state !== "geplant");

  async function toggleDoNotCall() {
    setBusy(true);
    setError("");
    const result = await actions.setDoNotCall({ leadId, value: !doNotCall });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  async function cancelPlanned() {
    if (!planned) return;
    setBusy(true);
    setError("");
    const result = await actions.cancelCall({ callId: planned.id });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="dash-lead-calls">
      {doNotCall && (
        <div className="dash-callout danger" role="status">
          <DashboardIcon name="block" size={20} weight="bold" />
          <div>
            <strong>Nicht mehr anrufen</strong>
            <p>
              Gesetzt am {format(doNotCallAt)}. Der Kontakt erscheint nicht mehr in der Anrufliste.
            </p>
          </div>
          <button className="dash-button secondary" type="button" onClick={toggleDoNotCall} disabled={busy}>
            Aufheben
          </button>
        </div>
      )}

      {error && (
        <div className="dash-feedback error" role="alert">
          <DashboardIcon name="error" size={18} />
          {error}
        </div>
      )}

      {planned ? (
        <div className="dash-panel dash-call-planned">
          <div className="dash-panel-head">
            <div>
              <h3>Geplanter Anruf</h3>
              <p>{format(planned.scheduled_at)}{planned.note ? ` · „${planned.note}"` : ""}</p>
            </div>
            <button className="dash-button ghost" type="button" onClick={cancelPlanned} disabled={busy}>
              <DashboardIcon name="call_end" size={18} />
              Absagen
            </button>
          </div>
          <CallOutcomeForm callId={planned.id} companyName={companyName} leadStatus={leadStatus} />
        </div>
      ) : doNotCall ? null : showScheduler ? (
        <div className="dash-panel">
          <CallScheduler leadId={leadId} companyName={companyName} onDone={() => window.location.reload()} />
        </div>
      ) : (
        <div className="dash-actions">
          <button className="dash-button" type="button" onClick={() => setShowScheduler(true)}>
            <DashboardIcon name="event_upcoming" size={18} />
            Anruf planen
          </button>
          <button className="dash-button ghost" type="button" onClick={toggleDoNotCall} disabled={busy}>
            <DashboardIcon name="block" size={18} />
            Nie wieder anrufen
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="dash-list">
          {history.map((call) => (
            <div className="dash-list-row compact" key={call.id}>
              <div className="dash-list-main">
                <strong>
                  {call.outcome ? callOutcomeLabels[call.outcome] : callStateLabels[call.state]}
                </strong>
                <small>{format(call.called_at || call.scheduled_at)}</small>
                {call.note && <small className="dash-call-note">„{call.note}"</small>}
              </div>
              <span className="dash-cell-muted">{call.phone || ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
