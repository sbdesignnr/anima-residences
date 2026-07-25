import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { LEGAL } from "@/lib/legal";

/**
 * The contact form's endpoint — delivers each enquiry by e-mail, with reply-to
 * set to the enquirer so replying to the notification writes straight to them.
 * The enquiry always lands in the project's own inbox (info@animaresidences.sk).
 *
 * TWO delivery paths, tried in this order:
 *   1. Resend (RESEND_API_KEY set) — an HTTP API built to send from serverless.
 *      Websupport (and most shared-hosting SMTP) rejects logins from datacenter
 *      IPs like Vercel's, so SMTP-from-Vercel returns a 535 even with the right
 *      password; Resend is the reliable route from the cloud.
 *   2. SMTP (SMTP_HOST + SMTP_PASS set) — kept as a fallback, e.g. for a mail
 *      host that does allow external/cloud logins.
 * If neither is configured it answers 501 and the form tells the visitor to phone.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY — from resend.com                                    [path 1]
 *   CONTACT_FROM   — From address; default onboarding@resend.dev (or the SMTP
 *                    login). Set to e.g. web@animaresidences.sk once the domain
 *                    is verified in Resend.
 *   CONTACT_TO     — where enquiries land; default info@animaresidences.sk
 *   SMTP_HOST/SMTP_PASS/SMTP_PORT/SMTP_USER                             [path 2]
 */

export const runtime = "nodejs";

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/* ── the branded notification e-mail ──────────────────────────────────────── */

const GOLD = "#B69A78";
const STONE = "#F2EDE6";
const INK = "#181913";
const PANEL = "#1C1C1A";
const HAIR = "rgba(242,237,230,0.10)";
const MUTE = "rgba(242,237,230,0.45)";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica, Arial, sans-serif";

type Fields = { name: string; email: string; phone: string; subject: string; unit: string; message: string; when: string };

function row(label: string, valueHtml: string) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${HAIR};width:36%;vertical-align:top;font-family:${SANS};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTE};">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid ${HAIR};font-family:${SANS};font-size:14px;line-height:1.55;color:${STONE};">${valueHtml}</td>
  </tr>`;
}

function renderEmail(f: Fields) {
  const rows =
    row("E-mail", `<a href="mailto:${esc(f.email)}" style="color:${GOLD};text-decoration:none;">${esc(f.email)}</a>`) +
    (f.phone ? row("Telefón", `<a href="tel:${esc(f.phone.replace(/\s/g, ""))}" style="color:${STONE};text-decoration:none;">${esc(f.phone)}</a>`) : "") +
    (f.subject ? row("Téma", esc(f.subject)) : "") +
    (f.unit ? row("Byt", esc(f.unit)) : "") +
    (f.message ? row("Správa", esc(f.message).replace(/\n/g, "<br>")) : "");

  return `<!doctype html><html><body style="margin:0;padding:0;background:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${INK};padding:32px 14px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${PANEL};border:1px solid rgba(182,154,120,0.30);">
        <tr><td style="padding:36px 38px 0;">
          <div style="font-family:${SERIF};font-size:22px;letter-spacing:0.42em;color:${STONE};">ANIMA</div>
          <div style="font-family:${SERIF};font-size:11px;letter-spacing:0.5em;color:${GOLD};margin-top:7px;">RESIDENCES</div>
          <div style="height:1px;background:rgba(182,154,120,0.30);margin:24px 0;"></div>
          <div style="font-family:${SANS};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${GOLD};">Nový dopyt z webu</div>
          <div style="font-family:${SERIF};font-size:28px;color:${STONE};margin-top:12px;">${esc(f.name)}</div>
        </td></tr>
        <tr><td style="padding:26px 38px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:26px 38px 0;">
          <div style="background:rgba(182,154,120,0.09);border-left:2px solid ${GOLD};padding:14px 16px;font-family:${SANS};font-size:13px;line-height:1.6;color:rgba(242,237,230,0.72);">
            Odpovedzte priamo na tento e-mail — píšete rovno záujemcovi (${esc(f.name)}).
          </div>
        </td></tr>
        <tr><td style="padding:26px 38px 32px;">
          <div style="height:1px;background:${HAIR};margin-bottom:16px;"></div>
          <div style="font-family:${SANS};font-size:11px;line-height:1.6;color:${MUTE};">Odoslané z formulára na animaresidences.sk · ${esc(f.when)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

function renderText(f: Fields) {
  return [
    "ANIMA RESIDENCES — nový dopyt z webu",
    "",
    `Meno:    ${f.name}`,
    `E-mail:  ${f.email}`,
    f.phone ? `Telefón: ${f.phone}` : "",
    f.subject ? `Téma:    ${f.subject}` : "",
    f.unit ? `Byt:     ${f.unit}` : "",
    "",
    f.message ? `Správa:\n${f.message}` : "",
    "",
    "Odpovedzte priamo na tento e-mail — píšete rovno záujemcovi.",
    `Odoslané z animaresidences.sk · ${f.when}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/* ── delivery ─────────────────────────────────────────────────────────────── */

const RESEND_FROM_DEFAULT = "Anima Residences <onboarding@resend.dev>";

async function deliver(opts: { to: string; from: string; replyTo: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: opts.from, to: [opts.to], reply_to: opts.replyTo, subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }

  // SMTP fallback
  const host = process.env.SMTP_HOST?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const user = (process.env.SMTP_USER || LEGAL.email).trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({ from: opts.from, to: opts.to, replyTo: opts.replyTo, subject: opts.subject, text: opts.text, html: opts.html });
}

function deliveryConfigured() {
  return !!process.env.RESEND_API_KEY?.trim() || !!(process.env.SMTP_HOST?.trim() && process.env.SMTP_PASS?.trim());
}

/* ── the handler ──────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body) {
    return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
  }

  // Bots fill every field they can see, including the one nobody can.
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const consent = body.consent;

  if (!name || !email || !consent) {
    return NextResponse.json({ error: "Vyplňte meno, e-mail a súhlas." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Skontrolujte, prosím, e-mailovú adresu." }, { status: 400 });
  }

  if (!deliveryConfigured()) {
    console.error("[kontakt] An enquiry arrived and could not be delivered — no RESEND_API_KEY and no SMTP.", { name, email });
    return NextResponse.json(
      {
        error:
          "Formulár zatiaľ nie je napojený na e-mail. Zavolajte nám, prosím, alebo napíšte priamo na info@animaresidences.sk.",
      },
      { status: 501 }
    );
  }

  const useResend = !!process.env.RESEND_API_KEY?.trim();
  const smtpUser = (process.env.SMTP_USER || LEGAL.email).trim();
  const to = (process.env.CONTACT_TO || LEGAL.email).trim();
  const from = (process.env.CONTACT_FROM || (useResend ? RESEND_FROM_DEFAULT : `Anima Residences <${smtpUser}>`)).trim();

  const fields: Fields = {
    name,
    email,
    phone: (body.phone ?? "").trim(),
    subject: (body.subject ?? "").trim(),
    unit: (body.unit ?? "").trim(),
    message: (body.message ?? "").trim(),
    when: new Intl.DateTimeFormat("sk-SK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bratislava" }).format(new Date()),
  };

  try {
    await deliver({
      to,
      from,
      replyTo: `${name} <${email}>`,
      subject: `Dopyt z webu — ${name}${fields.subject ? ` · ${fields.subject}` : ""}`,
      html: renderEmail(fields),
      text: renderText(fields),
    });
  } catch (err) {
    console.error("[kontakt] send failed", err);
    return NextResponse.json(
      { error: "Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám zavolajte." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

/* ── diagnostics ──────────────────────────────────────────────────────────── */
/**
 * Visit /api/kontakt to see what the running app sees. `?verify=1` opens the SMTP
 * connection (only relevant to the SMTP fallback) and reports the real error.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pass = process.env.SMTP_PASS?.trim();
  const useResend = !!process.env.RESEND_API_KEY?.trim();

  const base = {
    configured: deliveryConfigured(),
    deliveryMethod: useResend ? "resend" : (process.env.SMTP_HOST && pass ? "smtp" : "none"),
    resendKeySet: useResend,
    smtpHost: process.env.SMTP_HOST?.trim() || null,
    smtpPass: !!pass,
    smtpPort: Number(process.env.SMTP_PORT || 465),
    smtpUser: process.env.SMTP_USER || LEGAL.email,
    contactTo: process.env.CONTACT_TO || LEGAL.email,
    contactFrom: process.env.CONTACT_FROM || (useResend ? RESEND_FROM_DEFAULT : null),
    // The relevant env var NAMES the running app actually sees (values hidden) —
    // reveals a typo like CONTACT_FORM or a var missing from this deployment.
    envKeys: Object.keys(process.env).filter((k) => /^(SMTP_|CONTACT_|RESEND_API_KEY|BREVO_)/.test(k)).sort(),
  };

  if (q.get("verify") !== "1") return NextResponse.json(base);

  const host = (q.get("host") || process.env.SMTP_HOST || "").trim();
  const user = (q.get("user") || process.env.SMTP_USER || LEGAL.email).trim();
  const port = Number(q.get("port") || process.env.SMTP_PORT || 465);
  const authMethod = (q.get("method") || "").toUpperCase() || undefined;
  const testPass = q.get("pass") || pass;

  if (!host || !testPass) {
    return NextResponse.json({ ...base, verify: "SMTP nie je nastavené (verify testuje len SMTP fallback)." });
  }

  const tried = { host, port, secure: port === 465, user, method: authMethod ?? "auto" };
  try {
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: testPass }, authMethod });
    await transporter.verify();
    return NextResponse.json({ ...base, verify: "OK — pripojenie a prihlásenie prešlo.", tried });
  } catch (err) {
    const e = err as { message?: string; code?: string; responseCode?: number; command?: string };
    return NextResponse.json({ ...base, verify: "FAILED", tried, error: e.message ?? String(err), code: e.code, responseCode: e.responseCode });
  }
}
