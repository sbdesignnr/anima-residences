import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import ContactPage from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Kontakt — Anima Residences",
  description:
    "Dohodnite si obhliadku bytu v Anima Residences v Nitre. Predajná kancelária, telefón, e-mail a cesta k nám.",
};

export default function Kontakt() {
  return (
    <>
      <Navigation />
      <main>
        <ContactPage />
      </main>
      <Footer />
    </>
  );
}
