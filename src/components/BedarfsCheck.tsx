import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MaterialIcon } from "./icons";
import {
  addons,
  findAddon,
  findOffer,
  formatEuro,
  geoCheck,
  packages,
  qrReviewTrigger,
  quickCheck,
  retainers,
  type Addon,
  type Offer,
} from "../data/pricing";

type Path = "setup" | "growth" | "care" | "single";
type Step = 1 | 2 | 3 | 4;
type Status = "idle" | "sending" | "success" | "error";

const pathOptions: { id: Path; icon: string; title: string; text: string }[] = [
  { id: "setup", icon: "rocket_launch", title: "Noch kein Profil – oder kaum gepflegt", text: "Ich möchte ein sauberes, vollständiges Profil-Setup." },
  { id: "growth", icon: "trending_up", title: "Profil vorhanden – ich will mehr Sichtbarkeit", text: "Ich möchte aktives Management für mehr Anfragen." },
  { id: "care", icon: "autorenew", title: "Profil läuft gut – ich möchte laufende Betreuung", text: "Ich möchte, dass mein Profil dauerhaft gepflegt bleibt." },
  { id: "single", icon: "extension", title: "Ich brauche nur eine Einzelleistung", text: "Landingpage, GEO-Check, Konkurrenzanalyse & Co." },
];

const pathOffers: Record<Exclude<Path, "single">, { question: string; offers: Offer[] }> = {
  setup: { question: "Nur ein sauberes Setup – oder inklusive Wettbewerbs-Blick?", offers: packages.slice(0, 2) },
  growth: { question: "3 Monate fokussiert – oder 6 Monate mit voller Betreuung?", offers: packages.slice(2, 4) },
  care: { question: "Basis-Pflege oder Rundum-Betreuung?", offers: retainers },
};

const singleServices: Addon[] = [...addons, geoCheck, qrReviewTrigger];

function pathForOffer(offerId: string): Path {
  if (offerId === "starter" || offerId === "essential") return "setup";
  if (offerId === "growth" || offerId === "local-pro") return "growth";
  return "care";
}

export default function BedarfsCheck() {
  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<Path | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const offer = offerId ? findOffer(offerId) : undefined;

  useEffect(() => {
    function applyPreselect(raw: string | null) {
      if (!raw) return;
      if (findOffer(raw)) {
        setPath(pathForOffer(raw));
        setOfferId(raw);
        setAddonIds([]);
        setStep(3);
      } else if (singleServices.some((service) => service.id === raw)) {
        setPath("single");
        setOfferId(null);
        setAddonIds([raw]);
        setStep(3);
      }
      setStatus("idle");
      setMessage("");
    }

    try {
      const stored = window.sessionStorage.getItem("bedarfscheck-preselect");
      if (stored) {
        window.sessionStorage.removeItem("bedarfscheck-preselect");
        applyPreselect(stored);
      }
    } catch {
      // Storage kann in gehärteten Browsern gesperrt sein.
    }

    const onPreselect = (event: Event) => {
      applyPreselect((event as CustomEvent<string>).detail ?? null);
    };
    window.addEventListener("bedarfscheck:preselect", onPreselect);
    return () => window.removeEventListener("bedarfscheck:preselect", onPreselect);
  }, []);

  const availableAddons = useMemo(() => {
    if (!offer) return [];
    return [...addons, geoCheck].filter((addon) => !offer.includedAddonIds.includes(addon.id));
  }, [offer]);

  const selectedAddons = useMemo(
    () => addonIds.map((id) => findAddon(id)).filter((addon): addon is Addon => Boolean(addon)),
    [addonIds],
  );

  const lineItems = useMemo(() => {
    const items: { name: string; price: string; note?: string }[] = [];
    if (offer) {
      items.push({ name: `${offer.name}`, price: `${offer.price} ${offer.period}` });
      if (offer.interval === "monatlich") {
        items.push({ name: quickCheck.name, price: `${quickCheck.price} einmalig`, note: "Pflicht beim Direkteinstieg" });
      }
    }
    selectedAddons.forEach((addon) => {
      items.push({ name: addon.name, price: addon.priceValue ? `${addon.price} ${addon.period}` : "auf Anfrage" });
    });
    return items;
  }, [offer, selectedAddons]);

  const totals = useMemo(() => {
    let once = 0;
    let monthly = 0;
    if (offer) {
      if (offer.interval === "monatlich") {
        monthly += offer.priceValue;
        once += quickCheck.priceValue;
      } else {
        once += offer.priceValue;
      }
    }
    selectedAddons.forEach((addon) => {
      if (addon.interval === "monatlich") monthly += addon.priceValue;
      else once += addon.priceValue;
    });
    return { once, monthly };
  }, [offer, selectedAddons]);

  const hasSelection = Boolean(offer) || selectedAddons.length > 0;
  function toggleAddon(id: string) {
    setAddonIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  function choosePath(next: Path) {
    setPath(next);
    setOfferId(null);
    setAddonIds([]);
    setStep(2);
  }

  function chooseOffer(id: string) {
    setOfferId(id);
    setAddonIds([]);
    setStep(3);
  }

  function restart() {
    try {
      window.sessionStorage.removeItem("bedarfscheck-preselect");
    } catch {
      // Storage kann in gehärteten Browsern gesperrt sein.
    }
    setStep(1);
    setPath(null);
    setOfferId(null);
    setAddonIds([]);
    setStatus("idle");
    setMessage("");
    setPrivacyConsent(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          topic: offer ? offer.name : "Einzelleistung",
          selection: { path, offerId, addonIds },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Anfrage konnte nicht gesendet werden.");
      }

      form.reset();
      setPrivacyConsent(false);
      setStatus("success");
      setMessage("Danke! Ihre Anfrage mit allen gewählten Optionen ist angekommen. Ich melde mich innerhalb von 24 Stunden.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.name !== "AbortError" ? error.message : "Bitte versuchen Sie es erneut.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const stepLabels = ["Ausgangslage", "Auswahl", "Optionen", "Anfrage"];

  return (
    <div className="bedarfs-check" id="bedarfs-check">
      <div className="bc-toolbar">
        <ol className="bc-steps" aria-label="Fortschritt">
          {stepLabels.map((label, index) => {
            const current = (index + 1) as Step;
            return (
              <li key={label} className={`bc-step ${step === current ? "active" : ""} ${step > current ? "done" : ""}`} aria-current={step === current ? "step" : undefined}>
                <span className="bc-step-index">{step > current ? <MaterialIcon name="check" size={14} /> : index + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
        {step !== 1 && (
          <button
            type="button"
            className="bc-reset"
            onClick={restart}
            disabled={status === "sending"}
            aria-label="Bedarfscheck vollständig zurücksetzen"
          >
            <MaterialIcon name="restart_alt" size={18} />
            <span>Zurücksetzen</span>
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="bc-panel">
          <p className="bc-question">Wo steht Ihr Google Business Profil heute?</p>
          <div className="bc-option-grid">
            {pathOptions.map((option) => (
              <button key={option.id} type="button" className="bc-option bc-path" onClick={() => choosePath(option.id)}>
                <span className="bc-option-icon"><MaterialIcon name={option.icon} size={22} /></span>
                <span className="bc-option-body">
                  <strong>{option.title}</strong>
                  <span className="bc-option-text">{option.text}</span>
                </span>
                <span className="bc-option-go" aria-hidden="true"><MaterialIcon name="arrow_forward" size={18} /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && path && path !== "single" && (
        <div className="bc-panel">
          <p className="bc-question">{pathOffers[path].question}</p>
          <div className="bc-option-grid two">
            {pathOffers[path].offers.map((entry) => (
              <button key={entry.id} type="button" className="bc-option offer" onClick={() => chooseOffer(entry.id)}>
                <span className="bc-option-head">
                  <strong>{entry.name}</strong>
                  <b>{entry.price}<small> {entry.period}</small></b>
                </span>
                <span className="bc-option-text">{entry.text}</span>
                <ul>
                  {entry.items.map((item) => (
                    <li key={item}><MaterialIcon name="check" size={15} />{item}</li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          {path === "care" && (
            <p className="bc-hint">
              <MaterialIcon name="info" size={16} />
              Beim Direkteinstieg prüfen wir Ihr Profil vorab einmalig ({quickCheck.name}, {quickCheck.price}) – so starten wir ohne Überraschungen.
            </p>
          )}
          <button type="button" className="bc-back" onClick={() => setStep(1)}>Zurück</button>
        </div>
      )}

      {step === 2 && path === "single" && (
        <div className="bc-panel">
          <p className="bc-question">Welche Leistungen benötigen Sie?</p>
          <div className="bc-addon-list">
            {singleServices.map((service) => (
              <label key={service.id} className={`bc-addon ${addonIds.includes(service.id) ? "checked" : ""}`}>
                <input type="checkbox" checked={addonIds.includes(service.id)} onChange={() => toggleAddon(service.id)} />
                <span className="bc-addon-name">
                  <strong>{service.name}</strong>
                  {service.sub && <small>{service.sub}</small>}
                </span>
                <b>{service.priceValue ? service.price : "auf Anfrage"}{service.priceValue > 0 && <small> {service.period}</small>}</b>
              </label>
            ))}
          </div>
          <div className="bc-nav">
            <button type="button" className="bc-back" onClick={() => setStep(1)}>Zurück</button>
            <button type="button" className="btn btn-primary" disabled={addonIds.length === 0} onClick={() => setStep(3)}>
              Weiter <span className="btn-icon"><ArrowRight size={18} /></span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bc-panel">
          <p className="bc-question">{offer ? "Unsere Empfehlung für Sie" : "Ihre Auswahl"}</p>

          {offer && (
            <div className="bc-recommendation">
              <span className="bc-option-head">
                <strong>{offer.name}</strong>
                <b>{offer.price}<small> {offer.period}</small></b>
              </span>
              <p>{offer.text}</p>
              <ul>
                {offer.items.map((item) => (
                  <li key={item}><MaterialIcon name="check" size={15} />{item}</li>
                ))}
              </ul>
              {offer.interval === "laufzeit" && offer.termMonths && (
                <p className="bc-hint">
                  <MaterialIcon name="info" size={16} />
                  Gesamtpreis für {offer.termMonths} Monate Laufzeit – entspricht ca. {formatEuro(Math.round(offer.priceValue / offer.termMonths))}/Monat.
                </p>
              )}
              {offer.interval === "monatlich" && (
                <p className="bc-hint">
                  <MaterialIcon name="info" size={16} />
                  Monatlich kündbar. Beim Direkteinstieg einmalig {quickCheck.price} für den {quickCheck.name}.
                </p>
              )}
            </div>
          )}

          {offer && availableAddons.length > 0 && (
            <>
              <p className="bc-subhead">Passende Add-ons ergänzen (optional):</p>
              <div className="bc-addon-list">
                {availableAddons.map((addon) => (
                  <label key={addon.id} className={`bc-addon ${addonIds.includes(addon.id) ? "checked" : ""}`}>
                    <input type="checkbox" checked={addonIds.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                    <span className="bc-addon-name">
                      <strong>{addon.name}</strong>
                      {addon.sub && <small>{addon.sub}</small>}
                    </span>
                    <b>{addon.price}<small> {addon.period}</small></b>
                  </label>
                ))}
              </div>
            </>
          )}

          {!offer && (
            <div className="bc-addon-list readonly">
              {lineItems.map((item) => (
                <div key={item.name} className="bc-addon checked">
                  <span className="bc-addon-name"><strong>{item.name}</strong>{item.note && <small>{item.note}</small>}</span>
                  <b>{item.price}</b>
                </div>
              ))}
            </div>
          )}

          <div className="bc-summary">
            {totals.once > 0 && <span><small>Einmalig</small><b>{formatEuro(totals.once)}</b></span>}
            {totals.monthly > 0 && <span><small>Monatlich</small><b>{formatEuro(totals.monthly)}</b></span>}
            {addonIds.includes("qr-review-trigger") && <span className="bc-summary-note"><small>QR Review Trigger</small><b>auf Anfrage</b></span>}
          </div>

          <div className="bc-nav">
            <button type="button" className="bc-back" onClick={() => setStep(path ? 2 : 1)}>Zurück</button>
            <button type="button" className="btn btn-primary" disabled={!hasSelection} onClick={() => setStep(4)}>
              Anfrage vorbereiten <span className="btn-icon"><ArrowRight size={18} /></span>
            </button>
          </div>
        </div>
      )}

      {step === 4 && status !== "success" && (
        <form className="bc-panel bc-form contact-form" onSubmit={handleSubmit} aria-describedby={message ? "bc-form-message" : undefined}>
          <p className="bc-question">Fast geschafft – wohin dürfen wir das Angebot schicken?</p>

          <div className="bc-review">
            {lineItems.map((item) => (
              <span key={item.name}><small>{item.name}</small><i className="bc-dots" aria-hidden="true"></i><b>{item.price}</b></span>
            ))}
            <span className="bc-review-total">
              <small>Ihre Anfrage</small>
              <i className="bc-dots" aria-hidden="true"></i>
              <b>
                {totals.once > 0 && `${formatEuro(totals.once)} einmalig`}
                {totals.once > 0 && totals.monthly > 0 && " + "}
                {totals.monthly > 0 && `${formatEuro(totals.monthly)}/Monat`}
              </b>
            </span>
          </div>

          <input className="trap" type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <label htmlFor="bc-name">
            Name
            <input id="bc-name" className="field" name="name" type="text" autoComplete="name" maxLength={180} required />
          </label>

          <label htmlFor="bc-email">
            E-Mail
            <input id="bc-email" className="field" name="email" type="email" autoComplete="email" maxLength={254} required />
          </label>

          <label className="full" htmlFor="bc-company">
            Unternehmen
            <input id="bc-company" className="field" name="company" type="text" autoComplete="organization" maxLength={180} />
          </label>

          <label className="full" htmlFor="bc-message">
            Anmerkung (optional)
            <textarea id="bc-message" className="field" name="message" rows={3} maxLength={1800} placeholder="Gibt es etwas, das wir vorab wissen sollten?" />
          </label>

          <button className="btn btn-primary full" disabled={status === "sending" || !privacyConsent} type="submit" aria-busy={status === "sending"}>
            {status === "sending" && <span className="button-spinner" aria-hidden="true" />}
            <span>{status === "sending" ? "Wird gesendet..." : "Anfrage mit Auswahl senden"}</span>
            <span className="btn-icon"><ArrowRight size={18} /></span>
          </button>

          <label className="privacy-consent full" htmlFor="bc-privacy-consent">
            <input
              id="bc-privacy-consent"
              name="privacy_consent"
              type="checkbox"
              required
              checked={privacyConsent}
              onChange={(event) => setPrivacyConsent(event.target.checked)}
            />
            <span>
              Ich habe die{" "}
              <a href="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a>{" "}
              gelesen und stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden.
            </span>
          </label>

          {message && (
            <p id="bc-form-message" className="form-message full error" role="alert">{message}</p>
          )}

          <div className="bc-nav full">
            <button type="button" className="bc-back" onClick={() => { setStep(3); setStatus("idle"); setMessage(""); }}>Zurück zur Auswahl</button>
          </div>
        </form>
      )}

      {status === "success" && (
        <div className="bc-panel bc-success" role="status">
          <span className="bc-option-icon"><MaterialIcon name="mark_email_read" size={26} /></span>
          <p className="bc-question">{message}</p>
          <button type="button" className="bc-back" onClick={restart}>Neue Anfrage stellen</button>
        </div>
      )}

      <p className="bc-footnote">
        Unsicher, was passt? <a href="#kontakt">Schreiben Sie uns direkt</a> – oder buchen Sie ein kostenloses Erstgespräch. Alle Preise exkl. 20% MwSt., Angebote richten sich an Unternehmen (B2B).
      </p>
    </div>
  );
}
