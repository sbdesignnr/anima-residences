import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import LegalLayout from "@/components/legal/LegalLayout";
import ConsentSettingsButton from "@/components/legal/ConsentSettingsButton";
import { CONSENT_MAX_AGE_DAYS } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Zásady používania cookies — Anima Residences",
  description:
    "Aké cookies a podobné technológie táto stránka používa, na čo slúžia, ako dlho trvajú a ako svoj súhlas kedykoľvek zmeníte.",
  robots: { index: true, follow: true },
};

export default function Cookies() {
  return (
    <>
      <Navigation />
      <main>
        <LegalLayout
          eyebrow="Súkromie"
          title="Zásady používania cookies"
          lead="Čo ukladáme vo vašom prehliadači, prečo, na ako dlho — a ako to máte pod kontrolou."
        >
          <h2>1. Čo sú cookies</h2>
          <p>
            Cookies sú malé textové súbory, ktoré web pri návšteve uloží vo vašom
            prehliadači. Slúžia na fungovanie stránky a na zapamätanie vašich
            preferencií. Používame aj podobné technológie — napríklad úložisko
            prehliadača (local storage).
          </p>

          <h2>2. Ako pýtame váš súhlas</h2>
          <p>
            Pri prvej návšteve zobrazíme lištu so súhlasom. <strong>Nevyhnutné</strong>{" "}
            cookies fungujú vždy; cookies pre <strong>mapy</strong> a prípadné{" "}
            <strong>analytické</strong> cookies sa spustia len s vaším súhlasom.
            Svoju voľbu môžete kedykoľvek zmeniť:
          </p>
          <p>
            <ConsentSettingsButton className="legal-btn">
              Otvoriť nastavenia cookies
            </ConsentSettingsButton>
          </p>

          <h2>3. Aké cookies používame</h2>

          <h3>Nevyhnutné</h3>
          <div className="legal-tablewrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Názov</th>
                  <th>Poskytovateľ</th>
                  <th>Účel</th>
                  <th>Doba</th>
                  <th>Typ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>anima_consent</code></td>
                  <td>Anima Residences (vlastná)</td>
                  <td>Uchováva vašu voľbu súhlasu s cookies, aby sme sa nepýtali pri každej návšteve</td>
                  <td>{CONSENT_MAX_AGE_DAYS} dní</td>
                  <td>HTTP cookie</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Web navyše používa dočasné úložisko prehliadača (local storage) na
            plynulé zobrazenie obsahu. Tieto údaje neopúšťajú vaše zariadenie a
            neslúžia na sledovanie.
          </p>

          <h3>Analytické</h3>
          <p>
            Aktuálne <strong>nepoužívame</strong> žiadne analytické ani štatistické
            cookies. Ak ich v budúcnosti nasadíme, aktivujú sa až po vašom súhlase a
            doplníme ich do tejto tabuľky.
          </p>

          <h3>Mapy a externý obsah</h3>
          <p>
            Na stránke <strong>Kontakt</strong> zobrazujeme interaktívnu mapu Google
            Maps — a to <strong>až po vašom súhlase</strong>. Po jej načítaní môže
            spoločnosť Google nastaviť vlastné cookies tretej strany na fungovanie,
            predvoľby a bezpečnosť mapy:
          </p>
          <div className="legal-tablewrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Názov</th>
                  <th>Poskytovateľ</th>
                  <th>Účel</th>
                  <th>Doba</th>
                  <th>Typ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>NID</code>, <code>CONSENT</code>, <code>SOCS</code>, <code>AEC</code>, <code>1P_JAR</code></td>
                  <td>Google</td>
                  <td>Fungovanie, predvoľby a bezpečnosť mapy Google Maps</td>
                  <td>Rádovo mesiace (určuje Google)</td>
                  <td>Cookies tretej strany</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Podmienky Google nájdete na{" "}
            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">
              policies.google.com
            </a>
            .
          </p>
          <p>
            Na stránke <strong>Lokalita</strong> zobrazujeme mapu s podkladmi{" "}
            <strong>CARTO</strong> a <strong>OpenStreetMap</strong>. Načítavajú sa
            len mapové dlaždice (obrázky) — tie <strong>nenastavujú cookies</strong>,
            no na ich doručenie sa spracúva vaša IP adresa. Túto mapu považujeme za
            funkčnú súčasť obsahu stránky.
          </p>

          <h2>4. Ako spravovať cookies</h2>
          <p>
            Najjednoduchšie cez{" "}
            <ConsentSettingsButton className="legal-btn legal-btn--inline">
              nastavenia cookies
            </ConsentSettingsButton>
            . Cookies viete spravovať aj priamo v prehliadači — zablokovať,
            obmedziť alebo vymazať už uložené cookies (v nastaveniach súkromia
            prehliadača Chrome, Safari, Firefox či Edge). Zablokovanie nevyhnutných
            cookies môže ovplyvniť fungovanie webu.
          </p>

          <h2>5. Odvolanie súhlasu</h2>
          <p>
            Súhlas môžete kedykoľvek odvolať — cez nastavenia cookies alebo
            vymazaním cookie <code>anima_consent</code> vo svojom prehliadači.
            Odvolanie nemá vplyv na spracúvanie, ktoré prebehlo pred ním.
          </p>

          <h2>6. Ďalšie informácie</h2>
          <p>
            Ako nakladáme s osobnými údajmi vo všeobecnosti, sa dočítate v{" "}
            <Link href="/ochrana-osobnych-udajov">Ochrane osobných údajov</Link>.
          </p>
        </LegalLayout>
      </main>
      <Footer />
    </>
  );
}
