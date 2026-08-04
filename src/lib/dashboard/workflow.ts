import type { LeadStatus, OfferStatus } from "./types";

const activeLeadStatuses = new Set<LeadStatus>([
  "audit_offen",
  "priorisiert",
  "kontaktiert",
  "gespraech",
  "angebot",
]);

const offerTransitions: Record<OfferStatus, OfferStatus[]> = {
  entwurf: ["erstellt"],
  erstellt: ["versendet", "entwurf"],
  versendet: ["angenommen", "abgelehnt", "abgelaufen"],
  angenommen: [],
  abgelehnt: [],
  abgelaufen: [],
};

export function leadStatusRequiresFollowUp(status: LeadStatus) {
  return activeLeadStatuses.has(status);
}

export function canTransitionOffer(from: OfferStatus, to: OfferStatus) {
  return offerTransitions[from].includes(to);
}

export function canConvertOfferToProject(status: OfferStatus) {
  return status === "angenommen";
}

/** Geändert werden darf ein Angebot nur, solange es den Kunden noch nicht erreicht hat. */
export function canEditOffer(status: OfferStatus) {
  return status === "entwurf" || status === "erstellt";
}

/** Archiviert wird alles, was bereits versendet wurde — Entwürfe wirft man weg. */
export function canArchiveOffer(status: OfferStatus) {
  return !canEditOffer(status);
}

/**
 * Endgültig löschen: nie versendete Angebote direkt, alles andere erst nach dem
 * Archivieren. Der Umweg über das Archiv macht das Löschen eines Dokuments,
 * das der Kunde in der Hand hatte, zu einer bewussten zweiten Entscheidung.
 * Hängt ein Projekt daran, geht es gar nicht — das blockiert auch die Datenbank.
 */
export function canDeleteOffer(status: OfferStatus, hasProject: boolean, archivedAt?: string | null) {
  if (hasProject) return false;
  if (canEditOffer(status)) return true;
  return Boolean(archivedAt);
}
