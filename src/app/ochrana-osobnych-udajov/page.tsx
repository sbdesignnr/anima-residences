import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import LegalLayout from "@/components/legal/LegalLayout";
import { LEGAL, SUPERVISOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov — Anima Residences",
  description:
    "Ako Anima Residences spracúva a chráni vaše osobné údaje — účely, právne základy, príjemcovia, doba uchovávania a vaše práva podľa GDPR.",
  robots: { index: true, follow: true },
};

export default function OchranaOsobnychUdajov() {
  return (
    <>
      <Navigation />
      <main>
        <LegalLayout
          eyebrow="Súkromie"
          title="Ochrana osobných údajov"
          lead="Ako spracúvame a chránime vaše osobné údaje pri prevádzke tejto stránky a pri komunikácii s vami."
        >
          <p>
            Tieto zásady vysvetľujú, ako spracúvame vaše osobné údaje v súvislosti
            s webovou stránkou <strong>{LEGAL.web}</strong> a s vybavovaním vašich
            dopytov. Postupujeme podľa Nariadenia Európskeho parlamentu a Rady (EÚ)
            2016/679 (<strong>GDPR</strong>) a zákona č. 18/2018 Z. z. o ochrane
            osobných údajov.
          </p>

          <h2>1. Kto spracúva vaše údaje</h2>
          <p>Prevádzkovateľom, ktorý určuje účely a prostriedky spracúvania, je:</p>
          <ul>
            <li><strong>{LEGAL.controllerName}</strong></li>
            <li>Sídlo: {LEGAL.seat}</li>
            <li>IČO: {LEGAL.ico}</li>
            {LEGAL.dic && <li>DIČ: {LEGAL.dic}</li>}
            <li>{LEGAL.register}</li>
          </ul>
          <p>
            Kontakt vo veciach ochrany osobných údajov: e-mail{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>, telefón{" "}
            <a href={`tel:${LEGAL.phoneHref}`}>{LEGAL.phone}</a>. Zodpovednú osobu
            (DPO) sme neurčili, pretože nám to zákon neukladá — vo všetkých otázkach
            nás kontaktujte na uvedenom e-maile.
          </p>

          <h2>2. Aké údaje a na aký účel spracúvame</h2>
          <div className="legal-tablewrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Účel</th>
                  <th>Údaje</th>
                  <th>Právny základ</th>
                  <th>Doba uchovávania</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Vybavenie dopytu z kontaktného formulára, e-mailu alebo telefonátu</td>
                  <td>Meno a priezvisko, e-mail, telefónne číslo, predmet dopytu, byt, o ktorý máte záujem, text správy</td>
                  <td>Čl. 6 ods. 1 písm. b) GDPR — opatrenia pred uzatvorením zmluvy na vašu žiadosť; a písm. a) — súhlas, ktorý udeľujete odoslaním formulára</td>
                  <td>Do vybavenia dopytu a následne najviac 12 mesiacov od poslednej komunikácie, ak nevznikne zmluvný vzťah; pri odvolaní súhlasu bezodkladne</td>
                </tr>
                <tr>
                  <td>Prevádzka, bezpečnosť a ochrana webu pred zneužitím</td>
                  <td>IP adresa, typ prehliadača a zariadenia, čas a rozsah prístupu (technické logy)</td>
                  <td>Čl. 6 ods. 1 písm. f) GDPR — oprávnený záujem na bezpečnej a funkčnej prevádzke</td>
                  <td>Krátkodobo, v rámci prevádzkových logov poskytovateľa hostingu</td>
                </tr>
                <tr>
                  <td>Súbory cookies a podobné technológie</td>
                  <td>Identifikátory uložené vo vašom zariadení — pozri Zásady používania cookies</td>
                  <td>Nevyhnutné: čl. 6 ods. 1 písm. f); ostatné: písm. a) — súhlas</td>
                  <td>Podľa typu cookie — pozri Zásady používania cookies</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Poskytnutie údajov je dobrovoľné. Bez mena a e-mailu však nevieme váš
            dopyt vybaviť. Údaje získavame priamo od vás; nezískavame ich z iných
            zdrojov ani ich nekupujeme.
          </p>

          <h2>3. Komu údaje sprístupňujeme</h2>
          <p>
            Vaše údaje <strong>nepredávame</strong> a neposkytujeme na marketing
            tretích strán. Spracúvajú ich pre nás iba starostlivo vybraní
            sprostredkovatelia na základe zmluvy a v našom mene:
          </p>
          <ul>
            <li><strong>Vercel Inc.</strong> — hosting a doručovanie webovej stránky.</li>
            <li><strong>Resend</strong> — doručenie e-mailu z kontaktného formulára do našej schránky (ak je formulár napojený na e-mail).</li>
            <li><strong>Google</strong> — zobrazenie mapy Google Maps na stránke Kontakt, a to iba po vašom súhlase.</li>
            <li><strong>CARTO a OpenStreetMap</strong> — mapové podklady na stránke Lokalita.</li>
          </ul>
          <p>
            <strong>Prenos do tretích krajín:</strong> niektorí poskytovatelia
            (napr. Vercel, Google) sídlia v USA. Prípadný prenos prebieha na základe
            primeraných záruk podľa čl. 46 GDPR (štandardné zmluvné doložky),
            prípadne v rámci EU–US Data Privacy Framework.
          </p>

          <h2>4. Ako dlho údaje uchovávame</h2>
          <p>
            Údaje uchovávame len na nevyhnutný čas uvedený v tabuľke vyššie. Po
            splnení účelu ich vymažeme alebo anonymizujeme — ak nám ich uchovanie
            neukladá osobitný predpis (napríklad účtovné a daňové doklady v prípade
            uzatvorenia zmluvy).
          </p>

          <h2>5. Vaše práva</h2>
          <p>Ako dotknutá osoba máte podľa GDPR právo:</p>
          <ul>
            <li>na <strong>prístup</strong> k svojim údajom a ich kópiu (čl. 15);</li>
            <li>na <strong>opravu</strong> nesprávnych a doplnenie neúplných údajov (čl. 16);</li>
            <li>na <strong>výmaz</strong> — „právo na zabudnutie" (čl. 17);</li>
            <li>na <strong>obmedzenie</strong> spracúvania (čl. 18);</li>
            <li>na <strong>prenosnosť</strong> údajov (čl. 20);</li>
            <li><strong>namietať</strong> proti spracúvaniu založenému na oprávnenom záujme (čl. 21);</li>
            <li>kedykoľvek <strong>odvolať súhlas</strong> — bez vplyvu na zákonnosť spracúvania pred odvolaním (čl. 7 ods. 3).</li>
          </ul>
          <p>
            Práva uplatníte e-mailom na <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{" "}
            alebo písomne na adrese sídla. Odpovieme najneskôr do jedného mesiaca.
          </p>

          <h2>6. Sťažnosť dozornému orgánu</h2>
          <p>
            Ak sa domnievate, že vaše údaje spracúvame v rozpore s právom, máte
            právo podať sťažnosť dozornému orgánu:
          </p>
          <ul>
            <li><strong>{SUPERVISOR.name}</strong></li>
            <li>{SUPERVISOR.address}</li>
            <li>E-mail: <a href={`mailto:${SUPERVISOR.email}`}>{SUPERVISOR.email}</a></li>
            <li>Telefón: {SUPERVISOR.phone}</li>
            <li>Web: <a href={`https://${SUPERVISOR.web}`} target="_blank" rel="noopener noreferrer">{SUPERVISOR.web}</a></li>
          </ul>

          <h2>7. Súbory cookies</h2>
          <p>
            Táto stránka používa cookies. Ich úplný zoznam, kategórie a možnosti
            správy nájdete v <Link href="/cookies">Zásadách používania cookies</Link>.
          </p>

          <h2>8. Automatizované rozhodovanie</h2>
          <p>
            Nevykonávame automatizované individuálne rozhodovanie ani profilovanie
            s právnymi účinkami pre vašu osobu.
          </p>

          <h2>9. Zmeny týchto zásad</h2>
          <p>
            Zásady môžeme z času na čas aktualizovať. Vždy platí verzia zverejnená
            na tejto stránke s uvedenou účinnosťou; podstatné zmeny oznámime na webe.
          </p>
        </LegalLayout>
      </main>
      <Footer />
    </>
  );
}
