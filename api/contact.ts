const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fallbackFrom = "LokalOptimal <onboarding@resend.dev>";
const MAX_FIELD_LENGTH = 180;
const MAX_MESSAGE_LENGTH = 1800;
const RESEND_TIMEOUT_MS = 8000;

function field(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function readResendError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text);
    return payload?.message || payload?.error?.message || text;
  } catch {
    return text;
  }
}

function isUnverifiedDomainError(message: string) {
  return message.toLowerCase().includes("domain is not verified");
}

function getEmailPayload(from: string, body: Record<string, string>) {
  const { name, email, company, topic, message } = body;

  return {
    from,
    to: process.env.CONTACT_TO_EMAIL,
    reply_to: email,
    subject: `Neue LokalOptimal Anfrage: ${topic || "Kontakt"}`,
    text: [
      `Name: ${name}`,
      `E-Mail: ${email}`,
      `Unternehmen: ${company || "-"}`,
      `Thema: ${topic || "-"}`,
      "",
      message,
    ].join("\n"),
  };
}

async function sendEmail(apiKey: string, from: string, body: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(getEmailPayload(from, body)),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!String(contentType).toLowerCase().includes("application/json")) {
    return res.status(415).json({ error: "Bitte als JSON senden." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const name = field(body.name);
  const email = field(body.email, 254).toLowerCase();
  const company = field(body.company);
  const topic = field(body.topic);
  const message = field(body.message, MAX_MESSAGE_LENGTH);
  const companyUrl = field(body.company_url, 120);
  const privacyConsent = body.privacy_consent === "on" || body.privacy_consent === true || body.privacy_consent === "true";

  if (companyUrl) {
    return res.status(200).json({ ok: true });
  }

  if (!name?.trim() || !emailPattern.test(email || "") || !message?.trim()) {
    return res.status(400).json({ error: "Bitte Name, gültige E-Mail und Nachricht ausfüllen." });
  }

  if (!privacyConsent) {
    return res.status(400).json({ error: "Bitte stimmen Sie der Datenschutzerklärung zu." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || fallbackFrom;

  if (!apiKey || !to) {
    return res.status(500).json({ error: "Kontaktformular ist noch nicht konfiguriert." });
  }

  let response: Response;

  try {
    response = await sendEmail(apiKey, from, { name, email, company, topic, message });
  } catch {
    return res.status(504).json({ error: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut." });
  }

  if (!response.ok) {
    const resendError = await readResendError(response);
    console.error("[contact]", response.status, resendError.slice(0, 240));

    if (from !== fallbackFrom && isUnverifiedDomainError(resendError)) {
      try {
        response = await sendEmail(apiKey, fallbackFrom, { name, email, company, topic, message });
      } catch {
        return res.status(504).json({ error: "Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut." });
      }

      if (response.ok) {
        return res.status(200).json({ ok: true });
      }

      const fallbackError = await readResendError(response);
      console.error("[contact fallback]", response.status, fallbackError.slice(0, 240));

      if (response.status === 403) {
        return res.status(502).json({
          error:
            "Die Absender-Domain ist in Resend noch nicht verifiziert. Bitte lokaloptimal.at in Resend verifizieren oder CONTACT_FROM_EMAIL vorerst entfernen.",
        });
      }
    }

    if (from === fallbackFrom && response.status === 403) {
      return res.status(502).json({
        error: "Der Resend-Testabsender ist eingeschränkt. Bitte CONTACT_FROM_EMAIL mit einer verifizierten Resend-Domain setzen.",
      });
    }

    return res.status(502).json({ error: "Nachricht konnte nicht gesendet werden." });
  }

  return res.status(200).json({ ok: true });
}
