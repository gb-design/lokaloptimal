import { describe, expect, it } from "vitest";
import { buildCallQueue, canLogOutcome, requiresFollowUp, suggestLeadStatus, type CallLeadRow, type CallRow } from "./calls";

const now = new Date("2026-08-04T10:00:00+02:00");

function lead(overrides: Partial<CallLeadRow> & { id: number; company_name: string }): CallLeadRow {
  return {
    contact_name: null,
    contact_phone: "+43 1 234 5678",
    priority: "mittel",
    status: "neu",
    do_not_call: false,
    updated_at: "2026-07-01T08:00:00Z",
    ...overrides,
  };
}

function planned(id: number, leadId: number, scheduledAt: string): CallRow {
  return {
    id,
    lead_id: leadId,
    state: "geplant",
    outcome: null,
    scheduled_at: scheduledAt,
    called_at: null,
    phone: null,
    note: null,
  };
}

describe("buildCallQueue", () => {
  it("sortiert geplante Anrufe nach Wiener Tagesgrenzen in überfällig, heute und demnächst", () => {
    const leads = [
      lead({ id: 1, company_name: "Bäckerei Gruber" }),
      lead({ id: 2, company_name: "Café Ludwig" }),
      lead({ id: 3, company_name: "Malerei Sturm" }),
      lead({ id: 4, company_name: "Späte Zeile" }),
    ];
    const calls = [
      planned(10, 1, "2026-08-03T09:00:00+02:00"),
      planned(11, 2, "2026-08-04T09:00:00+02:00"),
      planned(12, 4, "2026-08-04T23:30:00+02:00"),
      planned(13, 3, "2026-08-05T09:00:00+02:00"),
    ];

    const queue = buildCallQueue(calls, leads, now);

    expect(queue.ueberfaellig.map((entry) => entry.companyName)).toEqual(["Bäckerei Gruber"]);
    expect(queue.heute.map((entry) => entry.companyName)).toEqual(["Café Ludwig", "Späte Zeile"]);
    expect(queue.demnaechst.map((entry) => entry.companyName)).toEqual(["Malerei Sturm"]);
    expect(queue.dueCount).toBe(3);
  });

  it("zählt erledigte Anrufe als Versuche und übernimmt das letzte Ergebnis", () => {
    const leads = [lead({ id: 1, company_name: "Bäckerei Gruber" })];
    const calls: CallRow[] = [
      {
        id: 8,
        lead_id: 1,
        state: "erledigt",
        outcome: "nicht_erreicht",
        scheduled_at: "2026-07-21T09:00:00+02:00",
        called_at: "2026-07-21T09:05:00+02:00",
        phone: null,
        note: "Mailbox",
      },
      {
        id: 9,
        lead_id: 1,
        state: "erledigt",
        outcome: "rueckruf",
        scheduled_at: "2026-07-28T09:00:00+02:00",
        called_at: "2026-07-28T09:10:00+02:00",
        phone: null,
        note: "Chef bis KW33 im Urlaub",
      },
      {
        id: 7,
        lead_id: 1,
        state: "abgesagt",
        outcome: null,
        scheduled_at: "2026-07-14T09:00:00+02:00",
        called_at: null,
        phone: null,
        note: null,
      },
      planned(10, 1, "2026-08-03T09:00:00+02:00"),
    ];

    const [entry] = buildCallQueue(calls, leads, now).ueberfaellig;

    expect(entry.attempts).toBe(2);
    expect(entry.lastOutcome).toBe("rueckruf");
    expect(entry.lastNote).toBe("Chef bis KW33 im Urlaub");
  });

  it("nimmt nur aktive Leads mit Nummer und ohne geplanten Anruf in anrufbar auf", () => {
    const leads = [
      lead({ id: 1, company_name: "Hat schon Termin" }),
      lead({ id: 2, company_name: "Ohne Nummer", contact_phone: null }),
      lead({ id: 3, company_name: "Gewonnen", status: "gewonnen" }),
      lead({ id: 4, company_name: "Verloren", status: "verloren" }),
      lead({ id: 5, company_name: "Will nicht", do_not_call: true }),
      lead({ id: 6, company_name: "Anrufbar" }),
    ];
    const calls = [planned(10, 1, "2026-08-05T09:00:00+02:00")];

    const queue = buildCallQueue(calls, leads, now);

    expect(queue.anrufbar.map((entry) => entry.companyName)).toEqual(["Anrufbar"]);
  });

  it("sortiert anrufbar nach Priorität und dann nach längster Stille", () => {
    const leads = [
      lead({ id: 1, company_name: "Mittel, alt", priority: "mittel", updated_at: "2026-01-01T08:00:00Z" }),
      lead({ id: 2, company_name: "Hoch, frisch", priority: "hoch", updated_at: "2026-08-01T08:00:00Z" }),
      lead({ id: 3, company_name: "Hoch, alt", priority: "hoch", updated_at: "2026-05-01T08:00:00Z" }),
      lead({ id: 4, company_name: "Niedrig", priority: "niedrig", updated_at: "2026-01-01T08:00:00Z" }),
    ];

    const queue = buildCallQueue([], leads, now);

    expect(queue.anrufbar.map((entry) => entry.companyName)).toEqual([
      "Hoch, alt",
      "Hoch, frisch",
      "Mittel, alt",
      "Niedrig",
    ]);
  });

  it("behält einen geplanten Anruf sichtbar, auch wenn der Lead auf nicht mehr anrufen steht", () => {
    const leads = [lead({ id: 1, company_name: "Will nicht", do_not_call: true })];
    const calls = [planned(10, 1, "2026-08-04T09:00:00+02:00")];

    const [entry] = buildCallQueue(calls, leads, now).heute;

    expect(entry.doNotCall).toBe(true);
  });

  it("ignoriert Anrufe zu Leads, die nicht in der Liste stehen", () => {
    const queue = buildCallQueue([planned(10, 99, "2026-08-04T09:00:00+02:00")], [], now);

    expect(queue.heute).toEqual([]);
    expect(queue.dueCount).toBe(0);
  });
});

describe("suggestLeadStatus", () => {
  it("schlägt kontaktiert vor, solange der Lead noch vor der Kontaktaufnahme steht", () => {
    expect(suggestLeadStatus("gespraech", "neu")).toBe("kontaktiert");
    expect(suggestLeadStatus("gespraech", "audit_offen")).toBe("kontaktiert");
    expect(suggestLeadStatus("rueckruf", "priorisiert")).toBe("kontaktiert");
  });

  it("stuft einen weiter fortgeschrittenen Lead niemals zurück", () => {
    expect(suggestLeadStatus("gespraech", "kontaktiert")).toBeNull();
    expect(suggestLeadStatus("gespraech", "gespraech")).toBeNull();
    expect(suggestLeadStatus("rueckruf", "angebot")).toBeNull();
    expect(suggestLeadStatus("gespraech", "gewonnen")).toBeNull();
  });

  it("schlägt verloren aus jedem Status vor, aber nicht doppelt", () => {
    expect(suggestLeadStatus("kein_interesse", "neu")).toBe("verloren");
    expect(suggestLeadStatus("kein_interesse", "angebot")).toBe("verloren");
    expect(suggestLeadStatus("kein_interesse", "verloren")).toBeNull();
  });

  it("schlägt bei nicht erreicht und falscher Nummer keinen Statuswechsel vor", () => {
    expect(suggestLeadStatus("nicht_erreicht", "neu")).toBeNull();
    expect(suggestLeadStatus("falsche_nummer", "neu")).toBeNull();
  });
});

describe("canLogOutcome", () => {
  it("erlaubt ein Ergebnis nur für einen geplanten Anruf", () => {
    expect(canLogOutcome("geplant")).toBe(true);
    expect(canLogOutcome("erledigt")).toBe(false);
    expect(canLogOutcome("abgesagt")).toBe(false);
  });
});

describe("requiresFollowUp", () => {
  it("verlangt einen Folgetermin nur beim vereinbarten Rückruf", () => {
    expect(requiresFollowUp("rueckruf")).toBe(true);
    expect(requiresFollowUp("nicht_erreicht")).toBe(false);
    expect(requiresFollowUp("kein_interesse")).toBe(false);
  });
});
