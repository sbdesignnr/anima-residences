import Link from "next/link";
import { SheetRef } from "@/components/ui/brand";
import { LEGAL, LEGAL_INCOMPLETE } from "@/lib/legal";

/**
 * The chrome shared by the legal documents (privacy + cookies): a charcoal
 * header band with the section label, title and effective date, then the readable
 * stone article. Content is passed as children and styled by the `.legal-*`
 * classes in globals.css. While the controller's identity is still a placeholder,
 * a discreet notice appears so the placeholders never read as a bug.
 */
export default function LegalLayout({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      {/* header band */}
      <header style={{ backgroundColor: "#1C1C1A" }}>
        <div className="mx-auto max-w-[820px] px-[6%] pb-16 pt-32 md:pb-20 md:pt-44">
          <Link
            href="/"
            className="annot inline-flex items-center gap-2 transition-colors duration-300 hover:text-gold"
            style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}
          >
            <span aria-hidden>←</span> SPÄŤ NA ANIMA RESIDENCES
          </Link>

          <div className="mt-12">
            <SheetRef label={eyebrow} />
          </div>
          <h1
            className="mt-7"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "clamp(38px, 6vw, 76px)",
              fontWeight: 300,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "#F2EDE6",
            }}
          >
            {title}
          </h1>
          {lead && <p className="legal-lead">{lead}</p>}
          <p className="annot mt-8" style={{ fontSize: "10px", color: "rgba(242,237,230,0.4)" }}>
            ÚČINNOSŤ OD {LEGAL.effective.toUpperCase()}
          </p>
        </div>
      </header>

      {/* body */}
      <div style={{ backgroundColor: "#F2EDE6", color: "#1C1C1A" }}>
        <div className="mx-auto max-w-[820px] px-[6%] py-20 md:py-28">
          {LEGAL_INCOMPLETE && (
            <p className="legal-notice" role="note">
              Tento dokument sa finalizuje — identifikačné údaje prevádzkovateľa
              (obchodné meno, sídlo, IČO a zápis v registri) budú čoskoro doplnené.
            </p>
          )}
          <div className="legal-body">{children}</div>
        </div>
      </div>
    </article>
  );
}
