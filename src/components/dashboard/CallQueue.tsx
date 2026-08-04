import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon, { type DashboardIconName } from "./DashboardIcon";
import { CallOutcomeForm, CallScheduler } from "./CallForms";
import {
  callOutcomeLabels,
  priorityLabels,
  type CallQueue as CallQueueData,
  type CallQueueEntry,
} from "../../lib/dashboard/types";
import { resultMessage } from "./action-utils";

type BucketKey = "ueberfaellig" | "heute" | "demnaechst" | "anrufbar";

const buckets: Array<{ key: BucketKey; title: string; hint: string; icon: DashboardIconName }> = [
  { key: "ueberfaellig", title: "Überfällig", hint: "Termin liegt in der Vergangenheit", icon: "error" },
  { key: "heute", title: "Heute", hint: "Heute fällig", icon: "today" },
  { key: "demnaechst", title: "Demnächst", hint: "Geplant für die nächsten Tage", icon: "schedule" },
  { key: "anrufbar", title: "Anrufbar", hint: "Nummer vorhanden, kein Anruf geplant", icon: "call" },
];

const dateTime = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  dateStyle: "medium",
  timeStyle: "short",
});

function idleLabel(days: number | null) {
  if (days === null) return null;
  if (days === 0) return "heute zuletzt bewegt";
  if (days === 1) return "seit 1 Tag ruhig";
  return `seit ${days} Tagen ruhig`;
}

export default function CallQueue({ queue }: { queue: CallQueueData }) {
  const [openRow, setOpenRow] = useState("");
  const [busyRow, setBusyRow] = useState("");
  const [error, setError] = useState("");

  async function cancel(entry: CallQueueEntry, rowKey: string) {
    if (!entry.callId) return;
    setBusyRow(rowKey);
    setError("");
    const result = await actions.cancelCall({ callId: entry.callId });
    if (result.error) {
      setError(resultMessage(result));
      setBusyRow("");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="dash-call-queue">
      {error && (
        <div className="dash-feedback error" role="alert">
          <DashboardIcon name="error" size={18} />
          {error}
        </div>
      )}

      {buckets.map((bucket) => {
        const entries = queue[bucket.key];
        if (!entries.length) return null;
        return (
          <section className="dash-panel dash-section" key={bucket.key} aria-labelledby={`calls-${bucket.key}`}>
            <div className="dash-panel-head">
              <div>
                <h2 id={`calls-${bucket.key}`}>
                  <DashboardIcon name={bucket.icon} size={18} weight="bold" />
                  {bucket.title}
                </h2>
                <p>{bucket.hint}</p>
              </div>
              <span className="dash-badge">{entries.length}</span>
            </div>

            <div className="dash-list">
              {entries.map((entry) => {
                const rowKey = `${bucket.key}-${entry.leadId}`;
                const isOpen = openRow === rowKey;
                return (
                  <article className="dash-call-row" key={rowKey} data-open={String(isOpen)}>
                    <div className="dash-call-main">
                      <div className="dash-list-main">
                        <a href={`/dashboard/leads/${entry.leadId}`}>{entry.companyName}</a>
                        <small>
                          {entry.scheduledAt && <>{dateTime.format(new Date(entry.scheduledAt))} · </>}
                          {entry.attempts
                            ? `${entry.attempts} ${entry.attempts === 1 ? "Versuch" : "Versuche"}`
                            : "Noch kein Anruf"}
                          {entry.lastOutcome && <> · zuletzt {callOutcomeLabels[entry.lastOutcome]}</>}
                          {bucket.key === "anrufbar" && idleLabel(entry.idleDays) && <> · {idleLabel(entry.idleDays)}</>}
                        </small>
                        {entry.contactName && <small>{entry.contactName}</small>}
                        {(entry.note || entry.lastNote) && <small className="dash-call-note">„{entry.note || entry.lastNote}"</small>}
                      </div>

                      <span className="dash-badge" data-tone={entry.priority}>
                        {priorityLabels[entry.priority]}
                      </span>

                      {entry.doNotCall && (
                        <span className="dash-badge" data-tone="hoch">
                          <DashboardIcon name="block" size={14} weight="bold" />
                          Nicht anrufen
                        </span>
                      )}

                      <div className="dash-call-actions">
                        {entry.phone ? (
                          <a className="dash-button" href={`tel:${entry.phone.replace(/\s/g, "")}`}>
                            <DashboardIcon name="call" size={18} weight="bold" />
                            {entry.phone}
                          </a>
                        ) : (
                          <span className="dash-cell-muted">Keine Nummer</span>
                        )}

                        <button
                          className="dash-button secondary"
                          type="button"
                          onClick={() => setOpenRow(isOpen ? "" : rowKey)}
                        >
                          <DashboardIcon name={entry.callId ? "check_circle" : "event_upcoming"} size={18} />
                          {entry.callId ? "Ergebnis" : "Anruf planen"}
                        </button>

                        {entry.callId && (
                          <button
                            className="dash-button ghost"
                            type="button"
                            onClick={() => cancel(entry, rowKey)}
                            disabled={busyRow === rowKey}
                          >
                            <DashboardIcon name={busyRow === rowKey ? "progress_activity" : "call_end"} size={18} />
                            Absagen
                          </button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="dash-call-drawer">
                        {entry.callId ? (
                          <CallOutcomeForm
                            callId={entry.callId}
                            companyName={entry.companyName}
                            leadStatus={entry.leadStatus}
                            onDone={() => window.location.reload()}
                          />
                        ) : (
                          <CallScheduler
                            leadId={entry.leadId}
                            companyName={entry.companyName}
                            onDone={() => window.location.reload()}
                          />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
