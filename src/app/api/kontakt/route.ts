import { NextResponse } from "next/server";

/**
 * The contact form's endpoint.
 *
 * It does NOT pretend. If no mail provider is configured it answers 501 and the
 * form tells the visitor plainly that it cannot send and to phone instead — a
 * lead that silently evaporates into a 200 is the single worst thing a sales
 * site can do, and the one nobody notices until the quarter is over.
 *
 * To turn it on, set two environment variables (.env.local):
 *   RESEND_API_KEY=re_...          — https://resend.com, free tier is enough
 *   CONTACT_TO=predaj@…            — where the enquiries land
 *   CONTACT_FROM=web@yourdomain    — optional; must be a verified sender
 */

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

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

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) {
    console.error(
      "[kontakt] An enquiry arrived and could not be delivered — RESEND_API_KEY / CONTACT_TO are not set.",
      { name, email }
    );
    return NextResponse.json(
      {
        error:
          "Formulár zatiaľ nie je napojený na e-mail. Zavolajte nám, prosím, alebo napíšte priamo na info@animaresidences.sk.",
      },
      { status: 501 }
    );
  }

  const rows: [string, string][] = [
    ["Meno", name],
    ["E-mail", email],
    ["Telefón", body.phone ?? "—"],
    ["Téma", body.subject ?? "—"],
    ["Byt", body.unit ?? "—"],
    ["Správa", body.message ?? "—"],
  ];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM ?? "Anima Residences <onboarding@resend.dev>",
      to: [to],
      reply_to: email,
      subject: `Dopyt z webu — ${name}${body.subject ? ` · ${body.subject}` : ""}`,
      html: rows
        .map(([k, v]) => `<p style="margin:0 0 8px"><strong>${k}:</strong> ${esc(String(v))}</p>`)
        .join(""),
    }),
  });

  if (!res.ok) {
    console.error("[kontakt] provider rejected the message", res.status, await res.text());
    return NextResponse.json(
      { error: "Správu sa nepodarilo odoslať. Skúste to prosím znova, alebo nám zavolajte." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
