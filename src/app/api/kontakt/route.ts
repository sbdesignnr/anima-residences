import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { LEGAL } from "@/lib/legal";

/**
 * The contact form's endpoint — delivers each enquiry by e-mail over SMTP.
 *
 * It sends AS the project's own mailbox (info@animaresidences.sk on Websupport)
 * and lands in that same inbox, with reply-to set to the enquirer — so replying
 * to the notification writes straight to the customer. It does NOT pretend: if
 * SMTP is not configured it answers 501 and the form tells the visitor plainly
 * to phone instead, because a lead that evaporates into a silent 200 is the one
 * thing a sales site must never do.
 *
 * Configure in Vercel → Settings → Environment Variables:
 *   SMTP_HOST   — Websupport outgoing server (e.g. smtp.m1.websupport.sk)   [required]
 *   SMTP_PASS   — the info@ mailbox password                               [required]
 *   SMTP_PORT   — 465 (SSL, default) or 587 (STARTTLS)                     [optional]
 *   SMTP_USER   — login; defaults to info@animaresidences.sk              [optional]
 *   CONTACT_TO  — where enquiries land; defaults to info@animaresidences.sk[optional]
 *   CONTACT_FROM— the From address; defaults to the login                  [optional]
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

function row(label: string, valueHtml: string) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid ${HAIR};width:36%;vertical-align:top;font-family:${SANS};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTE};">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid ${HAIR};font-family:${SANS};font-size:14px;line-height:1.55;color:${STONE};">${valueHtml}</td>
  </tr>`;
}

function renderEmail(f: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  unit: string;
  message: string;
  when: string;
}) {
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

function renderText(f: { name: string; email: string; phone: string; subject: string; unit: string; message: string; when: string }) {
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
    `Odpovedzte priamo na tento e-mail — píšete rovno záujemcovi.`,
    `Odoslané z animaresidences.sk · ${f.when}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
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

  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  const user = process.env.SMTP_USER || LEGAL.email;
  const to = process.env.CONTACT_TO || LEGAL.email;
  const from = process.env.CONTACT_FROM || user;
  const port = Number(process.env.SMTP_PORT || 465);

  if (!host || !pass) {
    console.error("[kontakt] An enquiry arrived and could not be delivered — SMTP_HOST / SMTP_PASS are not set.", { name, email });
    return NextResponse.json(
      {
        error:
          "Formulár zatiaľ nie je napojený na e-mail. Zavolajte nám, prosím, alebo napíšte priamo na info@animaresidences.sk.",
      },
      { status: 501 }
    );
  }

  const fields = {
    name,
    email,
    phone: (body.phone ?? "").trim(),
    subject: (body.subject ?? "").trim(),
    unit: (body.unit ?? "").trim(),
    message: (body.message ?? "").trim(),
    when: new Intl.DateTimeFormat("sk-SK", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bratislava" }).format(new Date()),
  };

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `Anima Residences <${from}>`,
      to,
      replyTo: `${name} <${email}>`,
      subject: `Dopyt z webu — ${name}${fields.subject ? ` · ${fields.subject}` : ""}`,
      text: renderText(fields),
      html: renderEmail(fields),
    });
  } catch (err) {
    console.error("[kontakt] SMTP send failed", err);
    return NextResponse.json(
      { error: "Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám zavolajte." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
