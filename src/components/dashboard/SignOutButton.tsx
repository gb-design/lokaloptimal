import { useState } from "react";
import { actions } from "astro:actions";
import DashboardIcon from "./DashboardIcon";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await actions.signOut();
    window.location.assign("/dashboard/login");
  }

  return (
    <button className="dash-icon-button" type="button" onClick={signOut} disabled={busy} aria-label="Abmelden">
      <DashboardIcon name={busy ? "progress_activity" : "logout"} size={18} />
    </button>
  );
}
