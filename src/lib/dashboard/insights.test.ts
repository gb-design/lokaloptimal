import { describe, expect, it } from "vitest";
import {
  buildDashboardOverview,
  calculateProjectProgress,
  normalizeLeadFilters,
  viennaDayBounds,
} from "./insights";

describe("dashboard insights", () => {
  it("uses Vienna calendar boundaries in winter and summer", () => {
    const winter = viennaDayBounds(new Date("2026-01-15T12:00:00Z"));
    expect(winter.start.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(winter.end.toISOString()).toBe("2026-01-15T23:00:00.000Z");

    const summer = viennaDayBounds(new Date("2026-07-28T12:00:00Z"));
    expect(summer.start.toISOString()).toBe("2026-07-27T22:00:00.000Z");
    expect(summer.end.toISOString()).toBe("2026-07-28T22:00:00.000Z");
  });

  it("builds real work, metric and pipeline data", () => {
    const overview = buildDashboardOverview(
      [
        {
          id: 1,
          company_name: "Café Blau",
          status: "neu",
          priority: "hoch",
          next_action: "Anrufen",
          next_action_at: "2026-07-27T09:00:00Z",
          updated_at: "2026-07-28T08:00:00Z",
        },
        {
          id: 2,
          company_name: "Praxis Grün",
          status: "angebot",
          priority: "mittel",
          next_action: "Unterlagen senden",
          next_action_at: "2026-07-28T10:00:00Z",
          updated_at: "2026-07-28T07:00:00Z",
        },
      ],
      [
        {
          id: 7,
          title: "Profiltext abstimmen",
          priority: "mittel",
          due_at: "2026-07-28T14:00:00Z",
          status: "offen",
          project: { id: 4, name: "Praxis Grün Aufbau" },
        },
      ],
      [
        {
          id: 9,
          offer_number: "LO-2026-0009",
          status: "versendet",
          valid_until: "2026-08-10",
          lead: { company_name: "Praxis Grün" },
        },
      ],
      [
        {
          id: 4,
          name: "Praxis Grün Aufbau",
          status: "wartet_auf_kunde",
          lead: { company_name: "Praxis Grün" },
        },
      ],
      [
        {
          id: 12,
          scheduled_at: "2026-07-28T08:00:00Z",
          lead: { id: 1, company_name: "Café Blau", priority: "hoch" },
        },
      ],
      new Date("2026-07-28T12:00:00Z"),
    );

    expect(overview.todayMetrics.map((metric) => metric.value)).toEqual([1, 1, 1, 1, 1]);
    expect(overview.workItems).toHaveLength(4);
    expect(overview.workItems[0].overdue).toBe(true);
    expect(overview.workItems[1].kind).toBe("call");
    expect(overview.workItems[1].context).toBe("Café Blau");
    expect(overview.pipelineTotal).toBe(2);
    expect(overview.pipeline.find((item) => item.status === "angebot")?.count).toBe(1);
    expect(overview.pendingOffers[0].companyName).toBe("Praxis Grün");
    expect(overview.blockedProjects[0].name).toBe("Praxis Grün Aufbau");
  });

  it("returns honest empty states without invented values", () => {
    const overview = buildDashboardOverview([], [], [], [], [], new Date("2026-07-28T12:00:00Z"));
    expect(overview.workItems).toEqual([]);
    expect(overview.pipelineTotal).toBe(0);
    expect(overview.pipeline.every((item) => item.share === 0)).toBe(true);
    expect(overview.todayMetrics.every((metric) => metric.value === 0)).toBe(true);
  });

  it("calculates project progress and overdue work from real tasks", () => {
    const progress = calculateProjectProgress(
      [
        { status: "erledigt", due_at: "2026-07-27T08:00:00Z" },
        { status: "offen", due_at: "2026-07-27T08:00:00Z" },
        { status: "offen", due_at: "2026-07-29T08:00:00Z" },
      ],
      new Date("2026-07-28T12:00:00Z"),
    );
    expect(progress).toEqual({ total: 3, completed: 1, open: 2, overdue: 1, percent: 33 });
  });

  it("normalizes lead filters and rejects unknown values", () => {
    expect(normalizeLeadFilters({
      search: "  Café  ",
      status: "angebot",
      priority: "hoch",
      due: "today",
      page: "2.9",
    })).toEqual({
      search: "Café",
      status: "angebot",
      priority: "hoch",
      due: "today",
      page: 2,
    });
    expect(normalizeLeadFilters({
      status: "falsch",
      priority: "sofort",
      due: "morgen",
      page: "kaputt",
    })).toEqual({
      search: undefined,
      status: undefined,
      priority: undefined,
      due: undefined,
      page: 1,
    });
  });
});
