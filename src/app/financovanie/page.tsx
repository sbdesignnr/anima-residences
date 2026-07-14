import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import FinancingPage from "@/components/financing/FinancingPage";

export const metadata: Metadata = {
  title: "Financovanie — Anima Residences",
  description:
    "Financovanie bývania v Anima Residences: výhodné sadzby partnerských bánk, osobný poradca, hypokalkulačka a prvá konzultácia zdarma.",
};

export default function Financovanie() {
  return (
    <>
      <Navigation />
      <main>
        <FinancingPage />
      </main>
      <Footer />
    </>
  );
}
