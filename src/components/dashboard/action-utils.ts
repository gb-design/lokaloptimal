export function resultMessage(result: any, fallback = "Die Änderung konnte nicht gespeichert werden.") {
  return result?.error?.message || fallback;
}

export function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function dateLabel(value?: string | null) {
  if (!value) return "Ohne Termin";
  return new Intl.DateTimeFormat("de-AT", { dateStyle: "medium" }).format(new Date(value));
}

export function money(value: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
