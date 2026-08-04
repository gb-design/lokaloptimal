import { useEffect, useMemo, useRef, useState } from "react";
import { actions } from "astro:actions";
import { Radio, RadioGroup } from "react-aria-components";
import DashboardIcon from "./DashboardIcon";
import { DashboardCheckbox } from "./FormControls";
import {
  auditBand,
  auditCriteria,
  calculateAuditCategoryScores,
  calculateAuditScore,
  suggestedRatingsFromGoogle,
} from "../../lib/dashboard/audit";
import {
  auditBandLabels,
  type AuditAnswerInput,
  type AuditCategory,
  type GooglePlaceSnapshot,
} from "../../lib/dashboard/types";
import { resultMessage } from "./action-utils";

type AuditRow = {
  id: number;
  status: "entwurf" | "abgeschlossen";
  score?: number | null;
  band?: string | null;
  google_snapshot?: GooglePlaceSnapshot | null;
  lead: {
    id: number;
    company_name: string;
    google_maps_url?: string | null;
  };
};

type AnswerRow = {
  criterion_key: string;
  rating: 0 | 1 | 2 | 3;
  note?: string | null;
};

type RecommendationRow = {
  id: number;
  catalog_item_id: string;
  catalog_item_name: string;
  reason: string;
  priority: string;
  selected: boolean;
};

const ratingLabels = ["Fehlt", "Schwach", "Solide", "Stark"];

export default function AuditEditor({
  audit,
  answers,
  recommendations: initialRecommendations,
}: {
  audit: AuditRow;
  answers: AnswerRow[];
  recommendations: RecommendationRow[];
}) {
  const [ratings, setRatings] = useState<Record<string, 0 | 1 | 2 | 3>>(
    Object.fromEntries(answers.map((answer) => [answer.criterion_key, answer.rating])),
  );
  const [snapshot, setSnapshot] = useState<GooglePlaceSnapshot>(audit.google_snapshot || {});
  /** Kriterien, deren Wert aus Google stammt und nicht aus deiner Beurteilung. */
  const [suggestedKeys, setSuggestedKeys] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [busy, setBusy] = useState<"save" | "complete" | "lookup" | "">("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const locked = audit.status === "abgeschlossen";

  const grouped = useMemo(() => {
    const groups = new Map<AuditCategory, typeof auditCriteria>();
    for (const criterion of auditCriteria) {
      const current = groups.get(criterion.category) || [];
      current.push(criterion);
      groups.set(criterion.category, current);
    }
    return [...groups.entries()];
  }, []);

  const answerPayload = useMemo(
    () =>
      Object.entries(ratings).map(([criterionKey, rating]) => ({
        criterionKey,
        rating,
      })) as AuditAnswerInput[],
    [ratings],
  );
  const previewScore = calculateAuditScore(answerPayload);
  const previewBand = auditBand(previewScore);
  const categoryScores = calculateAuditCategoryScores(answerPayload);
  const completeCount = Object.keys(ratings).length;
  const isComplete = completeCount === auditCriteria.length;

  async function lookup() {
    if (!audit.lead.google_maps_url) {
      setFeedback({ type: "error", text: "Beim Lead ist noch kein Google-Maps-Link gespeichert." });
      return;
    }
    setBusy("lookup");
    setFeedback(null);
    try {
      const response = await fetch("/api/internal/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: audit.lead.google_maps_url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const nextSnapshot = {
        place_id: payload.found?.place_id,
        name: payload.details?.name || payload.found?.name,
        address: payload.details?.address || payload.found?.address,
        ...payload.details,
      };
      setSnapshot(nextSnapshot);
      const suggestions = suggestedRatingsFromGoogle(nextSnapshot);
      const definedSuggestions = Object.fromEntries(
        Object.entries(suggestions).filter((entry): entry is [string, 0 | 1 | 2 | 3] => entry[1] !== undefined),
      );
      // Bestehende Antworten gewinnen — ein Vorschlag überschreibt nie dein Urteil.
      const applied = Object.keys(definedSuggestions).filter((key) => ratings[key] === undefined);
      setRatings((current) => ({ ...definedSuggestions, ...current }));
      setSuggestedKeys(new Set(applied));
      setFeedback({
        type: "success",
        text: `Google-Daten geladen, ${applied.length} messbare Kriterien vorgeschlagen. Bitte prüfen und die restlichen selbst bewerten.`,
      });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Google Places war nicht erreichbar." });
    } finally {
      setBusy("");
    }
  }

  // Google-Daten einmalig beim Öffnen holen, solange noch kein Snapshot da ist.
  // Bewusst hier und nicht in startAudit: der Lookup sind drei aufeinanderfolgende
  // Netzaufrufe mit je 6,5 s Zeitlimit und darf das Anlegen eines Audits nicht blockieren.
  const autoLookupDone = useRef(false);
  useEffect(() => {
    if (autoLookupDone.current) return;
    if (locked) return;
    if (!audit.lead.google_maps_url) return;
    if (Object.keys(audit.google_snapshot || {}).length) return;
    autoLookupDone.current = true;
    void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(complete: boolean) {
    if (complete && completeCount !== auditCriteria.length) {
      setFeedback({
        type: "error",
        text: `Noch ${auditCriteria.length - completeCount} Kriterien offen. Bitte bewerten Sie alle Bereiche.`,
      });
      return;
    }
    setBusy(complete ? "complete" : "save");
    setFeedback(null);
    const result = await actions.saveAudit({
      auditId: audit.id,
      answers: answerPayload,
      googleSnapshot: snapshot as Record<string, unknown>,
      complete,
    });
    if (result.error) {
      setFeedback({ type: "error", text: resultMessage(result) });
      setBusy("");
      return;
    }
    if (complete) {
      window.location.reload();
      return;
    }
    setFeedback({ type: "success", text: "Audit-Entwurf und Maßnahmen wurden gespeichert." });
    setBusy("");
    window.setTimeout(() => window.location.reload(), 450);
  }

  async function toggleRecommendation(id: number, selected: boolean) {
    setRecommendations((current) => current.map((entry) => (entry.id === id ? { ...entry, selected } : entry)));
    const result = await actions.setRecommendationSelection({ id, selected });
    if (result.error) {
      setRecommendations((current) => current.map((entry) => (entry.id === id ? { ...entry, selected: !selected } : entry)));
      setFeedback({ type: "error", text: resultMessage(result) });
    }
  }

  return (
    <div className="dash-stack">
      <div className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Bewertung</h2>
            <p>{completeCount} von {auditCriteria.length} Kriterien beantwortet</p>
          </div>
          <div className="dash-score">
            <span className="dash-score-number">{previewScore}</span>
            <span>
              <strong>{isComplete ? auditBandLabels[previewBand] : "Zwischenstand"}</strong>
              <small style={{ display: "block", color: "var(--dash-muted)", marginTop: ".2rem" }}>
                {isComplete ? "von 100 Punkten" : "aus den bewerteten Kriterien"}
              </small>
            </span>
          </div>
        </div>

        <div className="dash-audit-breakdown" aria-label="Audit-Ergebnis nach Bereichen">
          {categoryScores.map((category) => (
            <div className="dash-audit-bar" key={category.category}>
              <div className="dash-audit-bar-label">
                <strong>{category.label}</strong>
                <small>{category.answered} von {category.criteria} bewertet</small>
              </div>
              <div
                className="dash-progress-track"
                role="progressbar"
                aria-label={`${category.label}: ${category.score} von 100`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={category.score}
              >
                <span className="dash-progress-fill" style={{ "--progress": category.score } as React.CSSProperties} />
              </div>
              <span className="dash-audit-bar-value">
                {category.answered ? `${category.contribution.toFixed(1)} / ${category.answeredWeight}` : "—"}
              </span>
            </div>
          ))}
        </div>

        <p className="dash-audit-note">
          Der kostenlose Check auf der Website bewertet nur die vier Signale, die Google öffentlich hergibt.
          Dieser Audit prüft zusätzlich Website, lokale Auffindbarkeit, Wettbewerb und Antwortverhalten — der
          interne Wert liegt deshalb üblicherweise niedriger als der, den der Interessent gesehen hat.
        </p>

        {!locked && (
          <div className="dash-actions" style={{ marginBottom: "1.5rem" }}>
            <button className="dash-button secondary" type="button" onClick={lookup} disabled={Boolean(busy)}>
              <DashboardIcon name={busy === "lookup" ? "progress_activity" : "travel_explore"} size={18} />
              Google-Daten laden
            </button>
            {snapshot.rating !== undefined && (
              <span className="dash-badge">Google: {snapshot.rating} ★ · {snapshot.review_count || 0} Bewertungen · {snapshot.photos_count || 0} Fotos</span>
            )}
          </div>
        )}

        <div className="dash-audit-groups">
          {grouped.map(([category, criteria]) => (
            <section className="dash-audit-group" key={category}>
              <div className="dash-audit-group-head">
                <h3>{criteria[0].categoryLabel}</h3>
                <span>{criteria.reduce((sum, criterion) => sum + criterion.weight, 0)} Punkte</span>
              </div>
              {criteria.map((criterion) => (
                <div className="dash-criterion" key={criterion.key}>
                  <div className="dash-criterion-copy">
                    <strong>
                      {criterion.label}
                      {suggestedKeys.has(criterion.key) && (
                        <span className="dash-badge" style={{ marginLeft: ".5rem" }}>Vorschlag aus Google</span>
                      )}
                    </strong>
                    <small>{criterion.description}</small>
                  </div>
                  <RadioGroup
                    className="dash-rating"
                    aria-label={criterion.label}
                    value={ratings[criterion.key]?.toString() || ""}
                    onChange={(value) => setRatings((current) => ({ ...current, [criterion.key]: Number(value) as 0 | 1 | 2 | 3 }))}
                    isDisabled={locked}
                  >
                    {ratingLabels.map((label, rating) => (
                      <Radio
                        key={label}
                        value={rating.toString()}
                        aria-label={`${label}: ${rating} von 3`}
                        className="dash-rating-option"
                        title={label}
                      >
                        {rating}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </section>
          ))}
        </div>

        {feedback && (
          <div className={`dash-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"} style={{ marginTop: "1.5rem" }}>
            <DashboardIcon name={feedback.type === "error" ? "error" : "check_circle"} size={18} />
            {feedback.text}
          </div>
        )}

        {!locked && (
          <div className="dash-actions" style={{ marginTop: "1.5rem" }}>
            <button className="dash-button secondary" type="button" onClick={() => save(false)} disabled={Boolean(busy)}>
              <DashboardIcon name={busy === "save" ? "progress_activity" : "save"} size={18} />
              Entwurf speichern
            </button>
            <button className="dash-button" type="button" onClick={() => save(true)} disabled={Boolean(busy)}>
              <DashboardIcon name={busy === "complete" ? "progress_activity" : "task_alt"} size={18} />
              Audit abschließen
            </button>
          </div>
        )}
      </div>

      <div className="dash-panel">
        <div className="dash-panel-head">
          <div>
            <h2>Empfohlene Maßnahmen</h2>
            <p>Aus schwachen Kriterien abgeleitet und vor dem Angebot anpassbar.</p>
          </div>
          {locked && (
            <a className="dash-button" href={`/dashboard/offers/new?lead=${audit.lead.id}&audit=${audit.id}`}>
              <DashboardIcon name="request_quote" size={18} />
              Angebot erstellen
            </a>
          )}
        </div>
        {recommendations.length ? (
          <div className="dash-choice-list">
            {recommendations.map((recommendation) => (
              <DashboardCheckbox
                isSelected={recommendation.selected}
                onChange={(selected) => toggleRecommendation(recommendation.id, selected)}
                key={recommendation.id}
              >
                <span className="dash-choice-copy">
                  <strong>{recommendation.catalog_item_name}</strong>
                  <small>Auslöser: {recommendation.reason}</small>
                </span>
                <span className="dash-badge" data-tone={recommendation.priority}>{recommendation.priority}</span>
              </DashboardCheckbox>
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <DashboardIcon name="lightbulb" size={30} />
            <strong>Noch keine Maßnahmen</strong>
            <p>Speichern Sie den Audit-Entwurf. Aus Bewertungen mit 0 oder 1 entstehen automatisch passende Leistungen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
