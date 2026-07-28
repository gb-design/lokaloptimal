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
