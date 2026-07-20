"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import { SheetRef } from "@/components/ui/brand";
import ApartmentDetail from "@/components/sections/ApartmentDetail";
import {
  apartmentsFor,
  bboxOf,
  buildFloors,
  centerOf,
  centroidOf,
  FLOOR_GEOMETRY,
  PLAN_H,
  PLAN_W,
  plural,
  polyPath,
  polyStr,
  UNITS,
  type Apartment,
  type Floor,
  type FloorGeometry,
  type FloorId,
  type Pt,
  type Unit,
} from "@/lib/building";

/** Dev-only; the chunk is never fetched unless `?calibrate` is present. */
const FloorCalibrator = dynamic(() => import("@/components/dev/FloorCalibrator"), {
  ssr: false,
});
const PlanCalibrator = dynamic(() => import("@/components/dev/PlanCalibrator"), {
  ssr: false,
});

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FLOOR_DATA_IDS: FloorId[] = ["4NP", "3NP", "2NP", "1NP"];

/* ────────────────────────────── tokens ────────────────────────────── */

/* Measured from the project's own assets — see globals.css for provenance. */
const GOLD = "#B69A78";   // brass: the gold of the mark itself
const STONE = "#F2EDE6";
const GREEN = "#86926A";  // sunlit leaf -> the "available" green
const RED = "#9C6B5C";    // muted brick (chosen: the render contains no red)
const DETAIL_BG = "#101109";

/**
 * Where the level scale stands, as a % of the image width.
 *
 * `predok`'s front-left edge runs down ~24.5% (the leftmost point of every floor
 * polygon in FLOOR_GEOMETRY). The scale sits just OUTSIDE it, so the hairline
 * traces the building's own corner against the sky rather than crossing the
 * facade, its short leaders reach in to each band, and the left column stays
 * free for the heading and the figures.
 */
const SCALE_X = 23.4;

/**
 * The chosen floor is CALLED OUT, not just lit.
 *
 * `predok.jpeg` is a three-quarter render, so a floor is a POLYGON that slants
 * with the perspective and folds around the corner — never a rectangle. The
 * callout is therefore drawn in SVG: one dark scrim over the whole picture with
 * the floor's exact shape punched OUT of it (an even-odd path), a warm wash and
 * a travelling glint inside that shape, and a gold hairline tracing its edge.
 * Because the scrim's hole is the floor's own polygon, the crisp edge lands
 * exactly under the hairline at any fold.
 */
const SCRIM = "rgba(6,6,6,0.7)";

/* ───────────────────────────── component ───────────────────────────── */

export default function BuildingInteractive() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const planBoxRef = useRef<HTMLDivElement>(null);
  /** The SVG callout: a scrim with the floor punched out, plus wash / glint / edge. */
  const calloutRef = useRef<SVGGElement>(null);
  const scrimRef = useRef<SVGPathElement>(null);
  const washRef = useRef<SVGPolygonElement>(null);
  const edgeRef = useRef<SVGPolygonElement>(null);
  const clipRef = useRef<SVGPolygonElement>(null);
  const sweepRef = useRef<SVGRectElement>(null);
  /** The polygon currently drawn, so a floor change can tween point-for-point. */
  const shownPts = useRef<Pt[] | null>(null);
  const leaderRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  /** The gold target that shows a first-time visitor what the facade does. */
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostPulse = useRef<HTMLSpanElement>(null);
  const demoRef = useRef<gsap.core.Timeline | null>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  /** Viewport rect of the clicked unit — the morph origin. */
  const origin = useRef({ top: 0, left: 0, right: 0, bottom: 0 });

  const [geometry, setGeometry] = useState<Record<FloorId, FloorGeometry>>(FLOOR_GEOMETRY);
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [calibrating, setCalibrating] = useState(false);
  const floors = useMemo(() => buildFloors(geometry), [geometry]);
  /** The live outline for a unit — the edited one while calibrating, else the shipped one. */
  const polyForUnit = useCallback(
    (u: Unit) => units.find((x) => x.letter === u.letter)?.poly ?? u.poly,
    [units]
  );

  const [activeFloorId, setActiveFloorId] = useState<FloorId | null>(null);
  // Derive from `floors` so a band being dragged updates the live spotlight.
  const activeFloor = activeFloorId
    ? (floors.find((f) => f.id === activeFloorId) ?? null)
    : null;
  const setActiveFloor = useCallback(
    (f: Floor | null) => setActiveFloorId(f ? f.id : null),
    []
  );
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [hinted, setHinted] = useState(false);
  /** Phones have no hover, so the section demonstrates itself. */
  const [autoTour, setAutoTour] = useState(false);
  /** Set only by an explicit floor choice — never by scrolling. */
  const [tourOff, setTourOff] = useState(false);

  const stopTour = useCallback(() => {
    setTourOff(true);
    setAutoTour(false);
  }, []);

  /*
   * The dev-only calibrator (`?calibrate`).
   *
   * react-hooks/set-state-in-effect objects to the setState below, and here it is
   * wrong to: what this reads — the query string and localStorage — does not
   * exist while the component renders on the server, so it CANNOT be derived in
   * render or in a lazy initialiser without a hydration mismatch. Reading a
   * browser-only value once, after mount, is exactly what an effect is for.
   *
   * It never runs in production, and it never runs without ?calibrate.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!new URLSearchParams(window.location.search).has("calibrate")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCalibrating(true);
    try {
      const saved = localStorage.getItem("anima:floor-geometry");
      if (saved) setGeometry(JSON.parse(saved));
      const savedU = localStorage.getItem("anima:plan-units");
      if (savedU) setUnits(JSON.parse(savedU));
    } catch {}
  }, []);

  const updateGeometry = useCallback((g: Record<FloorId, FloorGeometry>) => {
    setGeometry(g);
    try {
      localStorage.setItem("anima:floor-geometry", JSON.stringify(g));
    } catch {}
  }, []);

  const resetGeometry = useCallback(() => {
    setGeometry(FLOOR_GEOMETRY);
    localStorage.removeItem("anima:floor-geometry");
  }, []);

  const updateUnits = useCallback((u: Unit[]) => {
    setUnits(u);
    try {
      localStorage.setItem("anima:plan-units", JSON.stringify(u));
    } catch {}
  }, []);

  const resetUnits = useCallback(() => {
    setUnits(UNITS);
    localStorage.removeItem("anima:plan-units");
  }, []);

  /**
   * Mobile auto-tour.
   *
   * There is no hover on a phone, so nothing tells the visitor the facade is
   * interactive: the spotlight cycles the floors whenever the picture is on
   * screen, and a stepper says what it is doing.
   *
   * It used to stop on the first `pointerdown` anywhere in the section — but on
   * a touch screen a *scroll* begins with a pointerdown, so one flick killed the
   * tour for good. It now ends only when a floor is actually chosen (stopTour),
   * pauses while the picture is off screen, and resumes when it comes back.
   */
  useEffect(() => {
    if (tourOff) return;
    const stage = stageRef.current;
    if (!stage) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let step = 0;

    const start = () => {
      if (timer) return;
      setAutoTour(true);
      setActiveFloorId(FLOOR_DATA_IDS[step]);
      timer = setInterval(() => {
        step = (step + 1) % FLOOR_DATA_IDS.length;
        setActiveFloorId(FLOOR_DATA_IDS[step]);
      }, 1900);
    };

    const pause = () => {
      clearInterval(timer);
      timer = undefined;
    };

    // Watch the picture, not the section: the section is taller than a phone,
    // so a threshold on it may never be met.
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : pause()),
      { threshold: 0.5 }
    );
    io.observe(stage);

    return () => {
      clearInterval(timer);
      io.disconnect();
    };
  }, [tourOff]);

  /* The section arrives: the elevation settles, the scale draws itself. */
  useGSAP(
    () => {
      const enter = { trigger: sectionRef.current, start: "top 68%" };

      gsap.fromTo(
        headingRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: "power3.out", scrollTrigger: enter }
      );
      // The elevation eases back into place — a camera settling, not a slide.
      gsap.fromTo(
        zoomRef.current,
        { scale: 1.06 },
        { scale: 1, duration: 1.8, ease: "power3.out", scrollTrigger: enter }
      );
      // The scale's hairline draws down; its level rows follow it in.
      gsap.fromTo(
        ".bld-scale-line",
        { scaleY: 0 },
        { scaleY: 1, transformOrigin: "top center", duration: 1.2, ease: "power3.out", scrollTrigger: enter }
      );
      gsap.fromTo(
        ".bld-level",
        { opacity: 0, x: -14 },
        { opacity: 1, x: 0, duration: 0.9, stagger: 0.09, ease: "power3.out", scrollTrigger: { ...enter, start: "top 58%" } }
      );

    },
    { scope: sectionRef }
  );

  /*
   * The invitation.
   *
   * A drawing does not look clickable, and a line of copy saying "hover the
   * facade" is a caption, not an instruction anybody follows. So the section
   * performs itself instead: a gold target climbs the elevation, lighting each
   * floor as it arrives — exactly the gesture we want back — and parks on the
   * floor that still has something to sell. The first time a real pointer finds
   * the facade, it hands over and never returns.
   */
  useGSAP(
    () => {
      if (!window.matchMedia("(pointer: fine)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const ghost = ghostRef.current;
      if (!ghost) return;

      // Breathing ring — runs the whole time the target is on screen.
      gsap.fromTo(
        ghostPulse.current,
        { scale: 1, opacity: 0.85 },
        { scale: 2.4, opacity: 0, duration: 1.9, repeat: -1, ease: "power2.out", transformOrigin: "center" }
      );

      // Ground floor upward, then rest on whatever is still available.
      const climb = [...floors].reverse();
      const park = floors.find((f) => f.volne > 0) ?? floors[1];

      const tl = gsap.timeline({ paused: true });
      tl.set(ghost, { top: `${centerOf(climb[0])}%`, opacity: 0 })
        .to(ghost, { opacity: 1, duration: 0.7, ease: "power2.out" });

      // The floor lights when the target LANDS on it, not when it sets off —
      // otherwise the callout jumps ahead and the target trails after it,
      // which reads as two unrelated things moving.
      climb.forEach((f, i) => {
        tl.to(ghost, {
          top: `${centerOf(f)}%`,
          duration: i === 0 ? 0.2 : 0.8,
          ease: "power2.inOut",
          onComplete: () => setActiveFloorId(f.id),
        }).to({}, { duration: 0.7 }); // let the visitor read the floor
      });

      tl.to(ghost, {
        top: `${centerOf(park)}%`,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => setActiveFloorId(park.id),
      });

      demoRef.current = tl;

      const st = ScrollTrigger.create({
        trigger: stageRef.current,
        start: "top 72%",
        once: true,
        onEnter: () => tl.play(),
      });

      return () => {
        st.kill();
        tl.kill();
      };
    },
    { dependencies: [floors], scope: sectionRef }
  );

  /*
   * Lighting a floor.
   *
   * The whole picture falls into shadow (a dark scrim) with the chosen floor's
   * exact polygon punched OUT of it — so what's left is a lit hole in the shape
   * of that floor, warmed by a wash and traced by a gold hairline. Moving to
   * another floor tweens the polygon point-for-point when the two shapes share a
   * vertex count, and snaps otherwise. A leader line runs from the level scale
   * to the band, and the figures below re-set themselves.
   */
  useGSAP(
    () => {
      const f = activeFloor;
      const ease = "power3.out";
      const D = 0.62;

      // Draw a polygon into every layer of the callout at once.
      const drawPts = (pts: Pt[]) => {
        const s = polyStr(pts);
        washRef.current?.setAttribute("points", s);
        edgeRef.current?.setAttribute("points", s);
        clipRef.current?.setAttribute("points", s);
        // even-odd: the outer frame minus the floor = a hole exactly its shape
        scrimRef.current?.setAttribute("d", `M0 0H100V100H0Z ${polyPath(pts)}`);
      };

      if (!f) {
        gsap.to([calloutRef.current, leaderRef.current], { opacity: 0, duration: 0.35, ease });
        gsap.to(cardRef.current, { opacity: 0, y: 10, duration: 0.28, ease });
        return;
      }

      const target = f.poly;
      const b = bboxOf(target);
      const from = shownPts.current;

      // Tween the shape when the vertex counts match; otherwise snap to it.
      if (from && from.length === target.length) {
        const p = { t: 0 };
        drawPts(from);
        gsap.to(p, {
          t: 1, duration: D, ease,
          onUpdate: () =>
            drawPts(target.map((tp, i) => [from[i][0] + (tp[0] - from[i][0]) * p.t, from[i][1] + (tp[1] - from[i][1]) * p.t] as Pt)),
        });
      } else {
        drawPts(target);
      }
      shownPts.current = target.map((p) => [...p] as Pt);
      gsap.to(calloutRef.current, { opacity: 1, duration: D, ease });

      // One pass of light travels across the lit floor (clipped to its shape).
      gsap.set(sweepRef.current, { attr: { y: b.top, height: b.height } });
      gsap.fromTo(
        sweepRef.current,
        { attr: { x: b.left - b.width } },
        { attr: { x: b.right + b.width * 0.2 }, duration: 1.25, delay: 0.12, ease: "power2.inOut" }
      );

      // Leader line + the marker gliding down the scale.
      gsap.to(leaderRef.current, { top: `${centerOf(f)}%`, width: `${b.left - SCALE_X}%`, opacity: 1, duration: D, ease });
      gsap.fromTo(leaderRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power4.out" });
      gsap.to(markerRef.current, { top: `${centerOf(f)}%`, duration: 0.7, ease: "power4.out" });

      // The figures re-set: block lifts in, the price counts to this floor's.
      gsap.fromTo(".bld-fig", { yPercent: 108, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease });
      gsap.to(cardRef.current, { opacity: 1, y: 0, duration: 0.35, ease });

      const el = priceRef.current;
      if (el) {
        const from = Number(el.dataset.v ?? 0);
        const p = { v: from };
        gsap.to(p, {
          v: f.cenaOd, duration: 0.75, ease: "power2.out",
          onUpdate: () => {
            const n = Math.round(p.v / 500) * 500; // settle in clean steps
            el.textContent = n.toLocaleString("sk-SK");
          },
          onComplete: () => {
            el.dataset.v = String(f.cenaOd);
            el.textContent = f.cenaOd.toLocaleString("sk-SK");
          },
        });
      }
    },
    { dependencies: [activeFloor], scope: sectionRef }
  );

  /*
   * Pointer parallax. The image and the interactive overlay move together, so
   * the hotspots never drift off the facade. Fine pointers only.
   */
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const targets = [zoomRef.current, overlayRef.current];
      const xTo = gsap.quickTo(targets, "x", { duration: 0.9, ease: "power3.out" });
      const yTo = gsap.quickTo(targets, "y", { duration: 0.9, ease: "power3.out" });

      const onMove = (e: PointerEvent) => {
        const r = section.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * -16);
        yTo(((e.clientY - r.top) / r.height - 0.5) * -10);
      };
      const onLeave = () => { xTo(0); yTo(0); };

      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
      return () => {
        section.removeEventListener("pointermove", onMove);
        section.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: sectionRef }
  );

  useGSAP(
    () => {
      if (!selectedFloor || !planRef.current) return;
      gsap.fromTo(planRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power3.out" });
    },
    { dependencies: [selectedFloor], scope: sectionRef }
  );

  /* The clicked unit unfolds into the full-screen detail: a clip-path inset
     morph from the unit's exact on-screen rect, while the plan recedes. */
  useGSAP(
    () => {
      const el = detailRef.current;
      if (!selectedApartment || !el) return;

      const r = origin.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const p = { t: 0 };
      const paint = (t: number) => {
        const k = 1 - t;
        gsap.set(el, {
          clipPath: `inset(${r.top * k}px ${(vw - r.right) * k}px ${(vh - r.bottom) * k}px ${r.left * k}px)`,
          // gold seam that fades as the panel opens
          boxShadow: `inset 0 0 0 ${1.5 * k}px rgba(196,168,130,${0.9 * k})`,
        });
      };
      paint(0);

      gsap
        .timeline()
        .to(planRef.current, { scale: 1.06, opacity: 0.35, filter: "blur(6px)", duration: 0.85, ease: "power3.inOut" }, 0)
        .to(p, { t: 1, duration: 0.85, ease: "power3.inOut", onUpdate: () => paint(p.t) }, 0)
        .fromTo(
          ".detail-reveal",
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.07, ease: "power3.out" },
          0.5
        );
    },
    { dependencies: [selectedApartment] }
  );

  /** A real pointer reached the facade: the demonstration has done its job. */
  const hideHint = () => {
    if (hinted) return;
    setHinted(true);
    demoRef.current?.kill();
    gsap.to(ghostRef.current, { opacity: 0, scale: 0.8, duration: 0.4, ease: "power2.out" });
  };

  const openFloor = (floor: Floor) => {
    stopTour(); // an explicit choice — the demo has done its job
    setActiveFloor(null);
    gsap
      .timeline()
      .to([overlayRef.current, headingRef.current], { opacity: 0, duration: 0.25, ease: "power2.out" }, 0)
      .to(zoomRef.current, {
        scale: 2, opacity: 0,
        transformOrigin: `${centroidOf(floor.poly)[0]}% ${centerOf(floor)}%`,
        duration: 0.7, ease: "power3.inOut",
      }, 0)
      .add(() => setSelectedFloor(floor));
  };

  const backToBuilding = () => {
    gsap
      .timeline()
      .to(planRef.current, { opacity: 0, duration: 0.35, ease: "power2.in" })
      .add(() => setSelectedFloor(null))
      .to(zoomRef.current, { scale: 1, opacity: 1, duration: 0.7, ease: "power3.inOut" }, "<")
      .to([overlayRef.current, headingRef.current], { opacity: 1, duration: 0.4 }, "<0.3");
  };

  /** `from` is whatever the visitor touched — the unit on the plan, or its row
      in the phone list. The detail unfolds out of exactly that rectangle. */
  const openApartment = (apt: Apartment, from: Element) => {
    const r = from.getBoundingClientRect();
    origin.current = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    setSelectedApartment(apt);
  };

  const closeApartment = () => {
    const el = detailRef.current;
    if (!el) return setSelectedApartment(null);
    const r = origin.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = { t: 1 };
    gsap
      .timeline({ onComplete: () => setSelectedApartment(null) })
      .to(".detail-reveal", { yPercent: -60, opacity: 0, duration: 0.3, stagger: 0.03, ease: "power2.in" }, 0)
      .to(p, {
        t: 0, duration: 0.6, ease: "power3.inOut",
        onUpdate: () => {
          const k = 1 - p.t;
          gsap.set(el, { clipPath: `inset(${r.top * k}px ${(vw - r.right) * k}px ${(vh - r.bottom) * k}px ${r.left * k}px)` });
        },
      }, 0.15)
      .to(planRef.current, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "power3.inOut" }, 0.15);
  };

  const card = activeFloor;

  return (
    <section
      ref={sectionRef}
      id="building"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#181913" }}
    >
      {/* Heading sits above the frame on phones, over it on desktop. */}
      <div ref={headingRef} className="bld-head">
        <SheetRef label="Ponuka bytov" />
        <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(30px, 5vw, 40px)", fontWeight: 300, lineHeight: 1.1, color: STONE, marginTop: "18px" }}>
          Vyberte si poschodie
        </h2>
        <p className="annot mt-4 hidden lg:block" style={{ fontSize: "10px", color: "rgba(242,237,230,0.38)", lineHeight: 2.2 }}>
          PREJDITE MYŠOU PO FASÁDE
        </p>
      </div>

      <div ref={stageRef} className="bld-stage">
      {/* ── Building ── */}
      <div className="bld-frame">
        <div ref={zoomRef} className="relative h-full w-full">
          <Image
            src="/images/predok.avif"
            alt="Vizualizácia budovy Anima Residences"
            fill
            sizes="150vw"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
      </div>

      {/* ── Base grade: vertical falloff + left scrim so the heading reads ── */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)," +
            "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 42%)",
        }}
      />

      {/* ── Interactive overlay, sharing the image's geometry ── */}
      <div ref={overlayRef} className="bld-frame" style={{ zIndex: 2 }}>
        {/* ── The callout + hotspots, in the photo's own coordinate space.
               `preserveAspectRatio="none"` maps the 0–100 viewBox straight onto
               the frame, so a point in image-% lands on the same pixel of the
               facade at every screen size. ── */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="bldWash" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,250,242,0.16)" />
              <stop offset="55%" stopColor="rgba(196,168,130,0.10)" />
              <stop offset="100%" stopColor="rgba(196,168,130,0)" />
            </linearGradient>
            <linearGradient id="bldSweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="60%" stopColor="rgba(196,168,130,0.22)" />
              <stop offset="100%" stopColor="rgba(196,168,130,0)" />
            </linearGradient>
            <clipPath id="bldFloorClip">
              <polygon ref={clipRef} points={polyStr(floors[0].poly)} />
            </clipPath>
          </defs>

          {/* the callout — hidden until a floor is chosen */}
          <g ref={calloutRef} style={{ opacity: 0, pointerEvents: "none" }} aria-hidden>
            {/* dark scrim over everything, with the floor punched out (even-odd) */}
            <path ref={scrimRef} d={`M0 0H100V100H0Z ${polyPath(floors[0].poly)}`} fillRule="evenodd" fill={SCRIM} />
            {/* warm wash + travelling glint, both confined to the floor */}
            <polygon ref={washRef} points={polyStr(floors[0].poly)} fill="url(#bldWash)" />
            <rect ref={sweepRef} x={-20} y={0} width={22} height={12} fill="url(#bldSweep)" clipPath="url(#bldFloorClip)" />
            {/* the gold hairline tracing the floor's edge */}
            <polygon
              ref={edgeRef}
              points={polyStr(floors[0].poly)}
              fill="none"
              stroke="rgba(196,168,130,0.95)"
              strokeWidth={1.4}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          {/* hotspots — the exact floor polygons, transparent but clickable */}
          {floors.map((floor) => (
            <polygon
              key={floor.id}
              points={polyStr(floor.poly)}
              fill="transparent"
              tabIndex={0}
              aria-label={`Podlažie ${floor.id}`}
              style={{ cursor: "pointer", pointerEvents: calibrating ? "none" : "fill", outline: "none" }}
              onMouseEnter={() => { setActiveFloor(floor); hideHint(); }}
              onFocus={() => setActiveFloor(floor)}
              onMouseLeave={() => setActiveFloor(null)}
              onBlur={() => setActiveFloor(null)}
              onClick={() => openFloor(floor)}
            />
          ))}
        </svg>

        {/* ── Level scale — the elevation read as a section: one hairline, a
               level mark per floor, and a leader drawn out to the lit band ── */}
        <div
          className="bld-scale-line pointer-events-none absolute hidden lg:block"
          style={{
            left: `${SCALE_X}%`,
            top: `${bboxOf(floors[0].poly).top}%`,
            height: `${bboxOf(floors[3].poly).bottom - bboxOf(floors[0].poly).top}%`,
            width: "1px",
            background: "linear-gradient(to bottom, rgba(242,237,230,0), rgba(242,237,230,0.22) 12%, rgba(242,237,230,0.22) 88%, rgba(242,237,230,0))",
          }}
          aria-hidden
        />
        <div
          ref={markerRef}
          className="pointer-events-none absolute hidden lg:block"
          style={{ left: `${SCALE_X}%`, top: `${centerOf(floors[0])}%`, width: "1px", height: "38px", marginTop: "-19px", background: GOLD, boxShadow: `0 0 12px ${GOLD}` }}
          aria-hidden
        />
        {/* the leader line — a dimension called out to the floor */}
        <div
          ref={leaderRef}
          className="pointer-events-none absolute hidden lg:block"
          style={{
            left: `${SCALE_X}%`,
            width: `${bboxOf(floors[0].poly).left - SCALE_X}%`,
            top: `${centerOf(floors[0])}%`,
            height: "1px",
            opacity: 0,
            transformOrigin: "left center",
            background: "linear-gradient(to right, rgba(182,154,120,0.95), rgba(182,154,120,0.2))",
          }}
          aria-hidden
        />

        {/* level rows, hung off the scale */}
        {floors.map((floor) => {
          const isActive = activeFloor?.id === floor.id;
          return (
            <button
              key={`scale-${floor.id}`}
              onMouseEnter={() => { setActiveFloor(floor); hideHint(); }}
              onFocus={() => setActiveFloor(floor)}
              onMouseLeave={() => setActiveFloor(null)}
              onBlur={() => setActiveFloor(null)}
              onClick={() => openFloor(floor)}
              className="bld-level absolute hidden items-center justify-end gap-4 lg:flex"
              style={{
                right: `${100 - SCALE_X}%`,
                top: `${centerOf(floor)}%`,
                transform: "translateY(-50%)",
                paddingRight: "12px",
                cursor: "pointer",
                pointerEvents: calibrating ? "none" : undefined,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: isActive ? "30px" : "24px",
                  fontWeight: 300,
                  lineHeight: 1,
                  color: isActive ? GOLD : "rgba(242,237,230,0.55)",
                  transition: "color 0.35s ease, font-size 0.35s cubic-bezier(0.22,1,0.36,1)",
                  whiteSpace: "nowrap",
                }}
              >
                {floor.id}
              </span>
              <span
                style={{
                  display: "block",
                  height: "1px",
                  width: isActive ? "26px" : "10px",
                  backgroundColor: isActive ? GOLD : "rgba(242,237,230,0.35)",
                  transition: "width 0.4s cubic-bezier(0.22,1,0.36,1), background-color 0.35s ease",
                }}
              />
            </button>
          );
        })}

        {/* ── The gold target. Sits over the facade, climbs it, and lights each
               floor on the way — the instruction, performed rather than
               written. Painted last so it rides above the callout. ── */}
        <div
          ref={ghostRef}
          className="pointer-events-none absolute hidden lg:block"
          style={{
            left: "42%",
            top: `${centerOf(floors[3])}%`,
            marginLeft: "-17px",
            marginTop: "-17px",
            opacity: 0,
          }}
          aria-hidden
        >
          {/* Gold on a lit cream facade has almost no contrast, so — exactly as
              the callout's own hairline does — every gold edge here rides on a
              dark seam, and the caption gets a dark plate to stand on. */}
          <span className="absolute" style={{ inset: 0, width: 34, height: 34, borderRadius: "50%", border: `1px solid ${GOLD}`, boxShadow: "0 0 0 1px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.3)" }} />
          <span ref={ghostPulse} className="absolute" style={{ inset: 0, width: 34, height: 34, borderRadius: "50%", border: `1px solid ${GOLD}`, boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }} />
          <span style={{ position: "absolute", left: 14, top: 14, width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 0 12px rgba(196,168,130,0.9)" }} />
          <span
            className="annot"
            style={{
              position: "absolute",
              left: 48,
              top: 6,
              whiteSpace: "nowrap",
              fontSize: "9px",
              color: GOLD,
              padding: "6px 10px",
              background: "rgba(16,17,12,0.82)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: "1px solid rgba(196,168,130,0.28)",
            }}
          >
            PREJDITE MYŠOU
          </span>
        </div>

        {/* Only while the facade is the thing on screen — a floor plan open on
            top has its OWN calibrator, and two live keyboard editors would fight. */}
        {calibrating && !selectedFloor && (
          <FloorCalibrator
            geometry={geometry}
            onChange={updateGeometry}
            onSelect={setActiveFloorId}
            frameRef={overlayRef}
            onReset={resetGeometry}
            onOpen={(id) => {
              const f = floors.find((x) => x.id === id);
              if (f) openFloor(f);
            }}
          />
        )}
      </div>

      {/* ── The figures. No card, no border — the numbers are simply set on the
             dark side of the frame, and re-set themselves as floors change. ── */}
      <div className="pointer-events-none absolute z-[4] hidden lg:block" style={{ left: "6%", bottom: "9%", width: "212px" }}>
        <div ref={cardRef} style={{ opacity: 0 }}>
          {card && (
            <>
              <Fig>
                <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "68px", fontWeight: 300, lineHeight: 1, color: STONE, letterSpacing: "0.01em", display: "block" }}>
                  {card.id}
                </span>
              </Fig>

              <div className="mt-5 h-px w-full" style={{ background: "rgba(242,237,230,0.18)" }} />

              {/* availability, one arch per apartment — filled means free */}
              <Fig className="mt-6">
                <span className="flex items-center gap-2">
                  {Array.from({ length: card.byty }).map((_, i) => {
                    const free = i < card.volne;
                    return (
                      <span
                        key={i}
                        style={{
                          display: "block", width: "11px", height: "14px",
                          borderRadius: "5.5px 5.5px 0 0",
                          border: `1px solid ${free ? GREEN : RED}`,
                          background: free ? GREEN : "transparent",
                          opacity: free ? 0.92 : 0.5,
                        }}
                      />
                    );
                  })}
                  <span className="annot" style={{ fontSize: "10px", color: card.volne > 0 ? GREEN : RED, marginLeft: "8px" }}>
                    {card.volne > 0
                      ? `${card.volne} ${plural(card.volne, "VOĽNÝ", "VOĽNÉ", "VOĽNÝCH")}`
                      : "VYPREDANÉ"}
                  </span>
                </span>
              </Fig>

              <Fig className="mt-4">
                <span className="annot" style={{ fontSize: "10px", color: "rgba(242,237,230,0.55)" }}>
                  {card.byty} {plural(card.byty, "BYT", "BYTY", "BYTOV")} · {card.vymera}
                </span>
              </Fig>

              <Fig className="mt-6">
                <span className="flex items-baseline gap-2.5" style={{ fontFamily: "var(--font-cormorant)", fontSize: "27px", fontWeight: 300, color: STONE }}>
                  <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.4)" }}>OD</span>
                  <span>
                    <span ref={priceRef} data-v={card.cenaOd} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {card.cenaOd.toLocaleString("sk-SK")}
                    </span>
                    {" €"}
                  </span>
                </span>
              </Fig>

              <Fig className="mt-7">
                <span className="annot inline-flex items-center gap-3" style={{ fontSize: "9px", color: GOLD, borderBottom: "1px solid rgba(182,154,120,0.45)", paddingBottom: "6px" }}>
                  OTVORIŤ PÔDORYS <span aria-hidden>→</span>
                </span>
              </Fig>
            </>
          )}
        </div>
      </div>

      </div>{/* /.bld-stage */}

      {/* ── Phone: which floor the tour is showing, and what to do about it ── */}
      <div className="lg:hidden" style={{ padding: "18px 6% 0" }}>
        <div className="flex items-center gap-4">
          {FLOOR_DATA_IDS.map((id) => {
            const on = activeFloorId === id;
            return (
              <button
                key={`step-${id}`}
                onClick={() => {
                  stopTour();
                  setActiveFloorId(id);
                }}
                className="flex-1"
                aria-label={`Ukáž ${id}`}
                style={{
                  height: 2,
                  background: on ? GOLD : "rgba(182,154,120,0.22)",
                  transition: "background-color 0.4s ease",
                }}
              />
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="annot" style={{ fontSize: 10, color: STONE }}>
            {activeFloor ? activeFloor.id : "—"}
          </span>

          {autoTour ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 8,
                  borderRadius: "3px 3px 0 0",
                  background: GOLD,
                  animation: "animaPulse 1.9s ease-in-out infinite",
                }}
              />
              <span className="annot" style={{ fontSize: 9, color: GOLD }}>
                ŤUKNITE NA PODLAŽIE
              </span>
            </span>
          ) : activeFloor ? (
            // The visitor has picked a floor: stop suggesting, start offering.
            <button
              onClick={() => openFloor(activeFloor)}
              className="annot"
              style={{ fontSize: 9, color: GOLD, borderBottom: `1px solid ${GOLD}`, paddingBottom: 4 }}
            >
              OTVORIŤ PÔDORYS →
            </button>
          ) : (
            <span className="annot" style={{ fontSize: 9, color: GOLD }}>
              VYBERTE PODLAŽIE
            </span>
          )}
        </div>
      </div>

      {/* ── Phone: the floors as a list. There is no hover on touch, so the
             availability has to be readable without pointing at anything. ── */}
      <ul className="lg:hidden" style={{ padding: "8px 6% 72px" }}>
        {floors.map((floor) => {
          const free = floor.volne > 0;
          return (
            <li key={`m-${floor.id}`}>
              <button
                onClick={() => openFloor(floor)}
                className="flex w-full items-center justify-between py-5"
                style={{ borderBottom: "1px solid rgba(182,154,120,0.18)" }}
              >
                <span className="flex items-baseline gap-4">
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "30px", fontWeight: 300, color: STONE, lineHeight: 1 }}>
                    {floor.id}
                  </span>
                </span>

                <span className="flex items-center gap-3">
                  <span className="annot" style={{ fontSize: "9px", color: "rgba(242,237,230,0.6)" }}>
                    {floor.cena.toUpperCase()}
                  </span>
                  <span style={{ display: "block", width: "6px", height: "8px", borderRadius: "3px 3px 0 0", backgroundColor: free ? GREEN : RED }} />
                  <span className="annot" style={{ fontSize: "9px", color: free ? GREEN : RED, minWidth: "78px", textAlign: "right" }}>
                    {free ? `${floor.volne} ${plural(floor.volne, "VOĽNÝ", "VOĽNÉ", "VOĽNÝCH")}` : "VYPREDANÉ"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>


      {/* ── Floor plan ── */}
      {selectedFloor && (
        <div ref={planRef} className="overlay-scroll fixed inset-0 z-[60] flex flex-col p-5 sm:p-8 md:p-16" style={{ backgroundColor: STONE }}>
          <div className="mb-6 flex items-center gap-4 md:mb-10">
            <button onClick={backToBuilding} aria-label="Späť na budovu" className="flex h-10 w-10 shrink-0 items-center justify-center border border-black/20 text-black/70 transition-colors hover:border-black/60">←</button>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", letterSpacing: "0.3em", color: "rgba(28,28,26,0.55)" }}>
              ANIMA RESIDENCES / <span style={{ color: "#1C1C1A" }}>{selectedFloor.id}</span>
            </p>
          </div>

          {/* The real drawing, with hover zones locked to its own pixel grid.
              `.plan-fit` / `.plan-box` fit it whole — see globals.css. */}
          <div className="plan-fit flex min-h-0 flex-1 items-center justify-center">
            <div ref={planBoxRef} className="plan-box relative">
              <Image
                src="/images/podorys.avif"
                alt={`Pôdorys ${selectedFloor.id}`}
                fill
                sizes="(max-width: 767px) 100vw, 60vw"
                style={{ objectFit: "contain" }}
                priority
              />

              <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="absolute inset-0 h-full w-full">
                {apartmentsFor(selectedFloor).map((apt) => {
                  const poly = polyForUnit(apt.unit);
                  const pts = polyStr(poly);
                  const free = apt.stav === "Voľný";
                  const [cx, cy] = centroidOf(poly);
                  return (
                    <g
                      key={apt.id}
                      className="group cursor-pointer"
                      onClick={(e) => openApartment(apt, e.currentTarget)}
                    >
                      <polygon
                        points={pts}
                        fill={GOLD}
                        className="unit-fill opacity-0 transition-opacity duration-300 group-hover:opacity-[0.18]"
                      />
                      <polygon
                        points={pts}
                        fill="transparent" stroke={GOLD} strokeWidth={4} strokeLinejoin="round"
                        className="unit-stroke opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />

                      {/* Touch: the plan is ~350px wide, so the chip below would
                          set its type at 5px. One large letter instead. */}
                      <text
                        className="unit-letter"
                        x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                        style={{ fontFamily: "var(--font-cormorant)", fontSize: 150, fill: "rgba(28,28,26,0.30)" }}
                      >
                        {apt.unit.letter}
                      </text>

                      {/* Pointer: the full chip — the drawing underneath is white */}
                      <g className="unit-chip opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <rect x={cx - 96} y={cy - 54} width={192} height={108} fill="rgba(12,11,9,0.9)" stroke={GOLD} strokeWidth={1} />
                        <text x={cx} y={cy - 16} textAnchor="middle" style={{ fontFamily: "var(--font-cormorant)", fontSize: 40, fill: STONE }}>{apt.id}</text>
                        <text x={cx} y={cy + 8} textAnchor="middle" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 13, letterSpacing: "0.18em", fill: "rgba(242,237,230,0.75)" }}>
                          {apt.dispozicia} · {apt.vymera}
                        </text>
                        <text x={cx} y={cy + 32} textAnchor="middle" style={{ fontFamily: "var(--font-dm-sans)", fontSize: 12, letterSpacing: "0.22em", fill: free ? GREEN : RED }}>
                          {free ? "VOĽNÝ" : "REZERVOVANÝ"}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {calibrating && (
                <PlanCalibrator
                  units={units}
                  onChange={updateUnits}
                  frameRef={planBoxRef}
                  onReset={resetUnits}
                />
              )}
            </div>
          </div>

          {/* ── Phone: the facts the chips can no longer carry ── */}
          <ul className="mt-5 shrink-0 lg:hidden">
            {apartmentsFor(selectedFloor).map((apt) => {
              const free = apt.stav === "Voľný";
              return (
                <li key={`plan-${apt.id}`}>
                  <button
                    onClick={(e) => openApartment(apt, e.currentTarget)}
                    className="flex w-full items-center justify-between py-3.5"
                    style={{ borderTop: "1px solid rgba(28,28,26,0.12)" }}
                  >
                    <span className="flex items-baseline gap-3">
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "26px", fontWeight: 300, color: "#1C1C1A", lineHeight: 1 }}>
                        {apt.id}
                      </span>
                      <span className="annot" style={{ fontSize: "9px", color: "rgba(28,28,26,0.5)" }}>
                        {apt.vymera}
                      </span>
                    </span>

                    <span className="flex items-center gap-3">
                      <span style={{ display: "block", width: "6px", height: "8px", borderRadius: "3px 3px 0 0", backgroundColor: free ? GREEN : RED }} />
                      <span className="annot" style={{ fontSize: "9px", color: free ? GREEN : RED, minWidth: "96px", textAlign: "right" }}>
                        {free ? "VOĽNÝ" : "REZERVOVANÝ"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Apartment detail: unfolds from the clicked unit ── */}
      {selectedApartment && selectedFloor && (
        <div
          ref={detailRef}
          className="overlay-scroll fixed inset-0 z-[70]"
          style={{ backgroundColor: DETAIL_BG }}
        >
          <ApartmentDetail
            apartment={selectedApartment}
            floor={selectedFloor}
            siblings={apartmentsFor(selectedFloor)}
            onClose={closeApartment}
            onSelect={setSelectedApartment}
          />
        </div>
      )}

    </section>
  );
}

/** One figure line, clipped so it can slide up into place on a floor change. */
function Fig({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ overflow: "hidden" }}>
      <div className="bld-fig">{children}</div>
    </div>
  );
}
