import { useState } from "react";
import { ArrowRight } from "./icons";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Nachricht konnte nicht gesendet werden.");
      }

      form.reset();
      setStatus("success");
      setMessage("Danke. Ihre Anfrage ist angekommen.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Bitte versuchen Sie es erneut.");
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <input className="trap" type="text" name="company_url" tabIndex={-1} autoComplete="off" />

      <label>
        Name
        <input className="field" name="name" type="text" autoComplete="name" required />
      </label>

      <label>
        E-Mail
        <input className="field" name="email" type="email" autoComplete="email" required />
      </label>

      <label>
        Unternehmen
        <input className="field" name="company" type="text" autoComplete="organization" />
      </label>

      <label>
        Worum geht es?
        <select className="field" name="topic" defaultValue="GBP Audit">
          <option>GBP Audit</option>
          <option>Profil-Setup</option>
          <option>Growth Paket</option>
          <option>Landingpage</option>
          <option>Sonstiges</option>
        </select>
      </label>

      <label className="full">
        Nachricht
        <textarea
          className="field"
          name="message"
          rows={5}
          placeholder="Kurz beschreiben, wo Ihr Google Business Profil gerade steht."
          required
        />
      </label>

      <button className="btn btn-primary full" disabled={status === "sending"} type="submit">
        {status === "sending" ? "Wird gesendet..." : "Anfrage senden"}
        <span className="btn-icon">
          <ArrowRight size={18} />
        </span>
      </button>

      {message && (
        <p className={`form-message full ${status === "success" ? "success" : "error"}`} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
