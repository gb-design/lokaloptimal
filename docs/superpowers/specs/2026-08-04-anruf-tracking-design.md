# Anruf-Tracking im internen Dashboard

Stand: 2026-08-04 · Status: freigegeben

## Problem

Das Dashboard zeigt, welche Leads einen nächsten Schritt brauchen, aber nicht, **wen ich anrufen kann oder muss** und **wie der letzte Anruf ausgegangen ist**. Wiederholte Anrufversuche, vereinbarte Rückrufe und Absagen verschwinden heute in Freitextnotizen. Damit fehlt die Grundlage für die einzige Frage, die beim Telefonieren zählt: Wen rufe ich als Nächstes an, und was weiß ich über den letzten Versuch?

## Ziel

Eine eigene Arbeitsansicht `/dashboard/calls`, in der fällige und mögliche Anrufe nach Dringlichkeit gebündelt sind, das Ergebnis eines Anrufs in einem Schritt erfasst wird und die Anrufhistorie pro Lead nachvollziehbar bleibt.

## Getroffene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Datenmodell | Eigene Tabelle `lead_calls` mit vollständiger Historie, nicht Felder auf `leads` |
| Ort im UI | Eigene Seite `/dashboard/calls` in der Hauptnavigation |
| Lead-Status | Das Ergebnisformular schlägt den Statuswechsel vor, vorausgewählt und abwählbar |
| Termine | Anruftermin und `next_action_at` bleiben getrennt, beide erscheinen gemischt in „Nächste Schritte" |
| Statusmodell | Lebenszyklus (`state`) und Ergebnis (`outcome`) in zwei Spalten, plus `do_not_call` auf dem Lead |

### Warum state und outcome getrennt sind

Ein einzelnes Statusfeld mit `offen | erreicht | nicht_erreicht | vertagt | abgelehnt` mischt zwei Fragen: *„ist dieser Anruf passiert?"* und *„was kam dabei heraus?"*. Das rächt sich bei jeder Auswertung nach Ergebnis und lässt abgesagte Anrufe ohne sinnvollen Wert zurück. Getrennte Spalten folgen der gängigen CRM-Praxis (Call Disposition ≠ Record State).

### Warum do_not_call auf dem Lead liegt

„Kein Interesse" heißt oft „nicht dieses Quartal" und ist wiedervorlagefähig. „Nie wieder anrufen" ist eine dauerhafte Eigenschaft des Kontakts, nicht eines einzelnen Anrufs, und muss auch dann greifen, wenn der Lead später über einen anderen Weg wieder in die Anrufliste käme. Für telefonische Kaltakquise in Österreich (§ 107 TKG) ist die dauerhafte, überprüfbare Unterdrückung ohnehin nicht verhandelbar.

## Datenmodell

Additive Migration `supabase/migrations/202608040001_lead_calls.sql`. Bestehende Tabellen werden nur erweitert, nicht verändert.

```sql
alter table public.leads
  add column do_not_call boolean not null default false,
  add column do_not_call_at timestamptz;

create table public.lead_calls (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lead_id bigint not null references public.leads(id) on delete cascade,
  state text not null default 'geplant'
    check (state in ('geplant', 'erledigt', 'abgesagt')),
  outcome text
    check (outcome in ('gespraech', 'rueckruf', 'kein_interesse',
                       'nicht_erreicht', 'falsche_nummer')),
  scheduled_at timestamptz,
  called_at timestamptz,
  phone text,
  note text,
  rescheduled_to_id bigint references public.lead_calls(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lead_calls_state_shape check (
    (state = 'geplant'  and scheduled_at is not null
                        and outcome is null and called_at is null) or
    (state = 'erledigt' and outcome is not null and called_at is not null) or
    (state = 'abgesagt' and outcome is null and called_at is null)
  )
);
```

**Ein geplanter Anruf ist dieselbe Zeile wie der später getätigte** — sie wechselt nur den `state`. Damit bildet das Modell direkt die vier gefragten Zustände ab:

| Gefragter Zustand | Abfrage |
|---|---|
| offen | `state = 'geplant'` |
| getätigt | `state = 'erledigt'` |
| vertagt | `outcome = 'rueckruf'` |
| abgelehnt | `outcome = 'kein_interesse'` bzw. `leads.do_not_call` |

Schutzmechanismen in der Datenbank, nicht nur im UI:

- Der Check-Constraint erzwingt die Feldkombination je `state`.
- `create unique index lead_calls_one_open_per_lead on public.lead_calls (lead_id) where state = 'geplant';` — maximal ein offener Anruf pro Lead, damit die Anrufliste denselben Kunden nie doppelt zeigt.
- Index `lead_calls_owner_state_scheduled_idx on (owner_id, state, scheduled_at) where state = 'geplant'` für die Warteschlange.
- Index `lead_calls_lead_idx on (lead_id, created_at desc)` für die Historie.
- RLS-Policy `lead_calls_owner_all` nach dem Muster von `offers`: eigener `owner_id` **und** der Lead gehört demselben Owner.
- `updated_at`-Trigger wie bei allen anderen Tabellen.

## Logik

Neues Modul `src/lib/dashboard/calls.ts` mit reinen Funktionen, im Stil von `insights.ts` und `workflow.ts`.

### buildCallQueue(calls, leads, now)

Liefert vier Blöcke:

- `ueberfaellig` — `state = 'geplant'`, `scheduled_at` vor dem heutigen Tagesbeginn (Wien)
- `heute` — `scheduled_at` innerhalb des heutigen Tages
- `demnaechst` — `scheduled_at` nach heute
- `anrufbar` — aktive Leads (nicht archiviert, Status nicht `gewonnen`/`verloren`, `do_not_call = false`) mit Telefonnummer und **ohne** geplanten Anruf, sortiert nach Priorität und längster Stille

Tagesgrenzen kommen aus `viennaDayBounds()` in `insights.ts`, damit „heute" überall im Dashboard dasselbe bedeutet.

Jeder Eintrag trägt die Zahl bisheriger Versuche und das letzte Ergebnis, damit in der Liste ohne Klick sichtbar ist, ob jemand zum ersten oder zum vierten Mal drankommt.

### suggestLeadStatus(outcome, currentStatus)

| Ergebnis | Vorschlag |
|---|---|
| `gespraech` | Lead → `kontaktiert` |
| `rueckruf` | Lead → `kontaktiert`, Folgetermin ist Pflicht |
| `kein_interesse` | Lead → `verloren`, zusätzlich ein **nicht** vorausgewähltes Häkchen „nie wieder anrufen" |
| `nicht_erreicht` | kein Statuswechsel, nur Wiedervorlage vorschlagen |
| `falsche_nummer` | kein Statuswechsel, Hinweis „Nummer prüfen" am Lead |

Schutzregel: **niemals zurückstufen.** Steht ein Lead bereits auf `gespraech`, `angebot` oder `gewonnen`, schlägt `gespraech` kein `kontaktiert` mehr vor. Nur `kein_interesse` → `verloren` gilt aus jedem Status.

### canLogOutcome(state)

Nur ein Anruf im `state = 'geplant'` kann abgeschlossen werden. Ein bereits erfasstes Ergebnis wird nicht nachträglich umgeschrieben — Korrekturen laufen über einen neuen Eintrag.

## Server-Actions

Vier neue Einträge in `src/actions/index.ts` nach bestehendem Muster (Zod-Input, `authenticated(context)`, `fail()`):

- `scheduleCall(leadId, scheduledAt, note?)` — lehnt ab, wenn bereits ein Anruf geplant ist, und ebenso bei `do_not_call`.
- `logCall(callId, outcome, note?, followUpAt?, applyLeadStatus?, markDoNotCall?)` — setzt `state = 'erledigt'`, `called_at`, `outcome`. Bei `rueckruf` ist `followUpAt` Pflicht; die Folgezeile entsteht in derselben Aktion und wird über `rescheduled_to_id` verlinkt.
- `cancelCall(callId)` — `state = 'abgesagt'`, zählt nicht als Ergebnis.
- `setDoNotCall(leadId, value)` — Flag und Zeitstempel, auch direkt vom Lead aus. Setzen sagt einen offenen Anruf automatisch ab.

**Kollision mit `assertLeadFollowUp`:** Die bestehende Regel verlangt bei aktiven Lead-Status einen `next_action` samt Datum. Setzt `logCall` einen Lead auf `kontaktiert`, ohne dass ein `next_action` existiert, geriete der Lead in einen Zustand, den das Lead-Formular später nicht mehr speichern kann. Lösung: `logCall` setzt in dem Fall `next_action = "Anruf"` und `next_action_at` auf den neuen Anruftermin. Gibt es keinen Folgetermin, unterbleibt der Statuswechsel und die Aktion meldet das zurück.

## Oberfläche

### Neu: /dashboard/calls

Navigationspunkt „Anrufe" mit Telefon-Icon zwischen „Heute" und „Leads" in `DashboardLayout.astro`.

```
Anrufe                                    [Anruf planen]
-----------------------------------------------------------
UEBERFAELLIG                                            2
  Baeckerei Gruber      +43 1 234 5678   [Anrufen] [Ergebnis]
  seit 28.07. offen  ·  2 Versuche  ·  Prio hoch

HEUTE                                                   1
  Cafe Ludwig           +43 1 555 9012   [Anrufen] [Ergebnis]
  vertagt vom 21.07. "Chef bis KW33 im Urlaub"

DEMNAECHST                                              3
  Malerei Sturm         Do 07.08. 09:00

ANRUFBAR  (kein Anruf geplant)                         12
  Fahrradwerkstatt Nord +43 1 777 3344   [Anruf planen]
  Prio hoch  ·  seit 34 Tagen keine Aktivitaet
```

„Anrufen" ist ein `tel:`-Link und wählt am Handy direkt. „Ergebnis" klappt das Formular inline auf.

### Komponenten

- `CallOutcomeForm.tsx` — Radio-Gruppe über die fünf Ergebnisse, Notiz, vorausgewähltes Status-Häkchen, Datumsfeld nur bei `rueckruf`, DNC-Häkchen nur bei `kein_interesse`.
- `CallScheduler.tsx` — Datum, Uhrzeit, Notiz.
- `CallQueue.tsx` — rendert die Blöcke und hält den aufgeklappten Zustand.

Alle drei folgen dem Muster von `LeadForm.tsx`: `actions.*`, `resultMessage()`, `DashboardDateField`, `DashboardCheckbox`, `dash-*`-Klassen.

### Bestehende Stellen

- `dashboard/index.astro`: neue Kachel „Anrufe fällig" in `todayMetrics`; Anrufe erscheinen als `workItems` mit `kind: "call"` und Telefon-Icon, gemischt nach Fälligkeit.
- Lead-Detailseite: Abschnitt „Anrufe" mit Historie und „Anruf planen"; DNC als deutlicher Banner, nicht als kleines Häkchen.
- `DashboardIcon.tsx`: neue Namen `call`, `call_end`, `schedule`.

## Tests

- `src/lib/dashboard/calls.test.ts` — Bucket-Grenzen um Mitternacht Wien, die Vorschlagstabelle inklusive Nicht-Zurückstufen-Regel, `canLogOutcome`, Ausschluss von DNC-Leads aus „Anrufbar", Versuchszählung.
- `supabase/tests/dashboard_rls.sql` — fremde `lead_calls` sind unsichtbar; der Check-Constraint lehnt inkonsistente Kombinationen ab; der Unique-Index verhindert zwei geplante Anrufe pro Lead.

## Bewusst nicht enthalten

Erinnerungen per E-Mail oder Push, Anrufdauer-Erfassung, Telefonie-Integration über einen Anbieter, wiederkehrende Anrufserien, Statistiken über Erfolgsquoten.
