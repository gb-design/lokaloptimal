import {
  findAddon,
  findOffer,
  quickCheck,
  type Addon,
  type Offer,
} from "../../data/pricing";
import type { OfferInterval } from "./types";

export type OfferItemSnapshot = {
  catalogItemId: string;
  name: string;
  description: string;
  interval: OfferInterval;
  unitPrice: number;
  priceLabel: string | null;
  quantity: number;
  period: string;
  sortOrder: number;
};

function snapshotOffer(entry: Offer, sortOrder: number): OfferItemSnapshot {
  return {
    catalogItemId: entry.id,
    name: entry.name,
    description: entry.items.join(" · "),
    interval: entry.interval,
    unitPrice: entry.priceValue,
    priceLabel: null,
    quantity: 1,
    period: entry.period,
    sortOrder,
  };
}

function snapshotAddon(entry: Addon, sortOrder: number): OfferItemSnapshot {
  return {
    catalogItemId: entry.id,
    name: entry.name,
    description: entry.tooltip,
    interval: entry.interval,
    unitPrice: entry.priceValue,
    priceLabel: entry.priceValue === 0 ? entry.price : null,
    quantity: 1,
    period: entry.period,
    sortOrder,
  };
}

export function buildOfferItems(offerId: string | null, addonIds: string[]): OfferItemSnapshot[] {
  const items: OfferItemSnapshot[] = [];
  const offer = offerId ? findOffer(offerId) : undefined;

  if (offer) {
    items.push(snapshotOffer(offer, items.length));
    if (offer.interval === "monatlich") {
      items.push(snapshotAddon(quickCheck, items.length));
    }
  }

  for (const id of [...new Set(addonIds)]) {
    const addon = findAddon(id);
    if (!addon || addon.id === quickCheck.id || offer?.includedAddonIds.includes(addon.id)) continue;
    items.push(snapshotAddon(addon, items.length));
  }

  if (!items.length) throw new Error("Bitte wählen Sie mindestens eine Leistung.");
  return items;
}

export function calculateOfferTotals(items: OfferItemSnapshot[]) {
  return items.reduce(
    (totals, item) => {
      const amount = item.unitPrice * item.quantity;
      if (item.interval === "monatlich") totals.monthly += amount;
      else totals.once += amount;
      return totals;
    },
    { once: 0, monthly: 0 },
  );
}

export function offerNumber(id: number, date = new Date()) {
  return `LO-${date.getFullYear()}-${String(id).padStart(4, "0")}`;
}
