import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import BuildingInteractive from "@/components/sections/BuildingInteractive";
import Amenities from "@/components/sections/Amenities";
import FinancingCTA from "@/components/sections/FinancingCTA";
import Timeline from "@/components/sections/Timeline";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <Intro />
        <BuildingInteractive />
        <Amenities />
        <FinancingCTA />
        <Timeline />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
