import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import LokalitaPage from "@/components/lokalita/LokalitaPage";

export const metadata: Metadata = {
  title: "Lokalita — Anima Residences",
  description:
    "Lokalita Anima Residences v Nitre: pod Zoborom, pri rieke a pár minút od centra. Interaktívna mapa dostupnosti — parky, školy, obchody a doprava podľa času cesty pešo, na bicykli či autom.",
};

export default function Lokalita() {
  return (
    <>
      <Navigation />
      <main>
        <LokalitaPage />
      </main>
      <Footer />
    </>
  );
}
