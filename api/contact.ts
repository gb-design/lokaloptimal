const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { name, email, company, topic, message, company_url: companyUrl } = req.body || {};

  if (companyUrl) {
    return res.status(200).json({ ok: true });
  }

  if (!name?.trim() || !emailPattern.test(email || "") || !message?.trim()) {
    return res.status(400).json({ error: "Bitte Name, gültige E-Mail und Nachricht ausfüllen." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || "LokalOptimal <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return res.status(500).json({ error: "Kontaktformular ist noch nicht konfiguriert." });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
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
    }),
  });

  if (!response.ok) {
    console.error("[contact]", await response.text());
    return res.status(502).json({ error: "Nachricht konnte nicht gesendet werden." });
  }

  return res.status(200).json({ ok: true });
}
