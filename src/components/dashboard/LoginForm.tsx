import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";
import { resultMessage } from "./action-utils";

export default function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await actions.signIn({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    });
    if (result.error) {
      setError(resultMessage(result));
      setBusy(false);
      return;
    }
    window.location.assign(next.startsWith("/dashboard") ? next : "/dashboard");
  }

  return (
    <form className="dash-form" onSubmit={submit}>
      <div className="dash-field">
        <label htmlFor="login-email">E-Mail-Adresse</label>
        <input id="login-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="dash-field">
        <label htmlFor="login-password">Passwort</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required />
      </div>
      {error && <div className="dash-feedback error" role="alert"><DashboardIcon name="error" size={18} />{error}</div>}
      <button className="dash-button" type="submit" disabled={busy}>
        <DashboardIcon name={busy ? "progress_activity" : "login"} size={18} />
        {busy ? "Anmeldung wird geprüft…" : "Im Arbeitsbereich anmelden"}
      </button>
    </form>
  );
}
