import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import OfferPage from "@/components/offer/OfferPage";

export const metadata: Metadata = {
  title: "Ponuka bytov — Anima Residences",
  description:
    "Ponuka bytov v Anima Residences v Nitre: jedenásť bytov v štyroch podlažiach, denné aj nočné vizualizácie, interaktívny výber podlažia, pôdorysy a prehľadný cenník s cenami a dostupnosťou.",
};

export default function PonukaBytov() {
  return (
    <>
      <Navigation />
      <main>
        <OfferPage />
      </main>
      <Footer />
    </>
  );
}
