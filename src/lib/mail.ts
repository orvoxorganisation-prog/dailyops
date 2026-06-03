import "server-only";

/** Sends mail via Resend when RESEND_API_KEY is set; otherwise logs to the
 *  server console (dev). Returns whether it was actually delivered. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ delivered: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "DailyOps <noreply@dailyops.app>";
  if (!key) {
    console.info(`\n[mail:dev] To: ${opts.to}\n[mail:dev] Subject: ${opts.subject}\n[mail:dev] ${opts.text ?? opts.html}\n`);
    return { delivered: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    return { delivered: res.ok };
  } catch {
    return { delivered: false };
  }
}
