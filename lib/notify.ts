// Email through Resend (https://resend.com). Everything here does nothing until RESEND_API_KEY is set,
// so the site works without it; the team then follows up by phone or WhatsApp.
export async function sendEmail(to: string | string[], subject: string, lines: string[]) {
  const key = process.env.RESEND_API_KEY;
  const list = (Array.isArray(to) ? to : [to]).flatMap((t) => t.split(",")).map((t) => t.trim()).filter(Boolean);
  if (!key || !list.length) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.ALERT_EMAIL_FROM || "Bus&Go <onboarding@resend.dev>", to: list, subject, text: lines.join("\n") }),
    });
  } catch (e) {
    console.error("sendEmail failed", e);
  }
}

const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** Alert the Bus&Go team (ALERT_EMAIL_TO, comma separated). */
export async function alertTeam(subject: string, lines: string[]) {
  await sendEmail(process.env.ALERT_EMAIL_TO ?? "", subject, [...lines, "", `${site()}/admin`]);
}
/** Message a customer or school, with a link back to their page. */
export async function notifyUser(email: string | null | undefined, subject: string, lines: string[], path: string) {
  if (email) await sendEmail(email, subject, [...lines, "", `${site()}${path}`, "", "Bus&Go Ltd, Kampala"]);
}
