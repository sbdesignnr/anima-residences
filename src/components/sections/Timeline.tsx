"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MILESTONES = [
  {
    date: "2024",
    title: "Zahájenie výstavby",
    body: "Príprava územia a základová doska v srdci Nitry.",
  },
  {
    date: "2025 · Q1",
    title: "Hrubá stavba",
    body: "Nosná konštrukcia všetkých šiestich podlaží.",
  },
  {
    date: "2025 · Q4",
    title: "Fasáda a opláštenie",
    body: "Prírodné materiály definujú tvár budovy.",
  },
  {
    date: "2026 · Q3",
    title: "Dokončovacie práce",
    body: "Interiéry, spoločné priestory a záhrada.",
  },
  {
    date: "2027 · Q1",
    title: "Kolaudácia a odovzdanie",
    body: "Vaše nové bývanie je pripravené.",
  },
];

export default function Timeline() {
  const container = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Fill the vertical progress line as the section scrolls through view.
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: container.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: true,
          },
        }
      );

      // Reveal each milestone as it enters.
      gsap.utils.toArray<HTMLElement>(".milestone").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 80%" },
        });
      });
    },
    { scope: container }
  );

  return (
    <section
      id="timeline"
      className="relative w-full bg-charcoal px-6 py-28 md:px-10 md:py-40"
    >
      <div ref={container} className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gold">
            Harmonogram
          </p>
          <h2 className="font-serif text-4xl font-light leading-tight text-stone md:text-5xl">
            Cesta k domovu
          </h2>
        </div>

        <div className="relative pl-10 md:pl-0">
          {/* Rail + animated fill */}
          {/*
            The dot is 16px wide and sits at -37px inside a 40px pad, so its
            LEFT edge is at 3px and its CENTRE at 11px. A 1px rail therefore has
            to start at 10.5px — at 7px it ran a clear 3.5px to the left of every
            dot it was supposed to thread.
          */}
          <div className="absolute bottom-0 left-[10.5px] top-2 w-px bg-earth/20 md:left-1/2 md:-translate-x-1/2">
            <div
              ref={line}
              className="absolute inset-0 origin-top bg-gold"
            />
          </div>

          <ul className="space-y-16">
            {MILESTONES.map((m, i) => (
              <li
                key={m.date}
                className={`milestone relative md:flex md:items-center ${
                  i % 2 === 0 ? "md:justify-start" : "md:flex-row-reverse"
                }`}
              >
                {/* Node */}
                <span className="absolute -left-[37px] top-1.5 h-4 w-4 rounded-full border border-gold bg-charcoal md:left-1/2 md:-translate-x-1/2" />

                <div className="md:w-1/2 md:px-10">
                  <div className="text-xs uppercase tracking-[0.25em] text-gold">
                    {m.date}
                  </div>
                  <h3 className="mt-2 font-serif text-2xl font-light text-stone">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-earth">
                    {m.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
