import { useState } from "react";
import { ArrowRight } from "./icons";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);

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
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Nachricht konnte nicht gesendet werden.");
      }

      form.reset();
      setPrivacyConsent(false);
      setStatus("success");
      setMessage("Danke. Ihre Anfrage ist angekommen.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.name !== "AbortError" ? error.message : "Bitte versuchen Sie es erneut.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} aria-describedby={message ? "contact-form-message" : undefined}>
      <input className="trap" type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <label htmlFor="contact-name">
        Name
        <input id="contact-name" className="field" name="name" type="text" autoComplete="name" maxLength={180} required />
      </label>

      <label htmlFor="contact-email">
        E-Mail
        <input id="contact-email" className="field" name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>

      <label htmlFor="contact-company">
        Unternehmen
        <input id="contact-company" className="field" name="company" type="text" autoComplete="organization" maxLength={180} />
      </label>

      <label htmlFor="contact-topic">
        Worum geht es?
        <select id="contact-topic" className="field" name="topic" defaultValue="GBP Audit">
          <option>GBP Audit</option>
          <option>Profil-Setup</option>
          <option>Growth Paket</option>
          <option>Landingpage</option>
          <option>Sonstiges</option>
        </select>
      </label>

      <label className="full" htmlFor="contact-message">
        Nachricht
        <textarea
          id="contact-message"
          className="field"
          name="message"
          rows={5}
          maxLength={1800}
          placeholder="Kurz beschreiben, wo Ihr Google Business Profil gerade steht."
          required
        />
      </label>

      <button className="btn btn-primary full" disabled={status === "sending" || !privacyConsent} type="submit" aria-busy={status === "sending"}>
        {status === "sending" && <span className="button-spinner" aria-hidden="true" />}
        <span>{status === "sending" ? "Wird gesendet..." : "Anfrage senden"}</span>
        <span className="btn-icon">
          <ArrowRight size={18} />
        </span>
      </button>

      <label className="privacy-consent full" htmlFor="contact-privacy-consent">
        <input
          id="contact-privacy-consent"
          name="privacy_consent"
          type="checkbox"
          required
          checked={privacyConsent}
          onChange={(event) => setPrivacyConsent(event.target.checked)}
        />
        <span>
          Ich habe die{" "}
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
            Datenschutzerklärung
          </a>{" "}
          gelesen und stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden.
        </span>
      </label>

      {message && (
        <p
          id="contact-form-message"
          className={`form-message full ${status === "success" ? "success" : "error"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
