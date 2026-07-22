"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const isPhone = () => window.matchMedia("(max-width: 767px)").matches;
const HERO_MOBILE = media.heroMobile;
const MOBILE_FILL = HERO_MOBILE.w / HERO_MOBILE.h <= 0.62;

/**
 * The opening film is a PRELOADED IMAGE SEQUENCE, not a scrubbed <video>.
 *
 * Seeking a paused video by scroll never runs smooth: every seek decodes from a
 * keyframe, the browser cannot keep up, and it stutters. Frames drawn straight
 * from memory have no decode-on-seek, so the scrub stays buttery on every device
 * — the whole point. The frames are cut from the ORIGINAL master, so the picture
 * quality is unchanged.
 */
const FRAMES = {
  desktop: { dir: "/images/hero-frames/desktop", count: 203, w: 1928, h: 1072 },
  mobile: { dir: "/images/hero-frames/mobile", count: 132, w: 1072, h: 1928 },
};

/**
 * The share of the pinned scroll spent on the OPENING (the plaster parting).
 * The film is held on its very first frame — the empty plot — for the whole
 * opening, and only STARTS scrubbing once the plaster is fully open. So the
 * visitor watches the build from nothing to finished, in one pass, exactly
 * like the film — never mid-way-in, which read as a "jump to the middle".
 * Small = a quick open, most of the scroll left for the film.
 */
const OPEN = 0.18;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const framesRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const waveTop = useRef<WaveHandle>(null);
  const waveBottom = useRef<WaveHandle>(null);
  /** One origin for both plaster halves, so they render the same living field. */
  const [start] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));

  // ── Load: the wordmark settles onto the plaster ──
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(".hw-line", { opacity: 1, y: 0 });
        gsap.set(".hw-rule", { scaleX: 1 });
        return;
      }
      gsap
        .timeline({ delay: 0.2 })
        .fromTo(".hw-anima", { opacity: 0, y: 30, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.5, ease: "power3.out" }, 0)
        .fromTo(".hw-res", { opacity: 0, y: -18, filter: "blur(5px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, 0.15)
        .fromTo(".hw-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "power4.inOut" }, 0.45)
        .fromTo(seamRef.current, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.5);
    },
    { scope: heroRef }
  );

  // ── Scroll: the seam sparks, the plaster splits, the film is revealed ──
  useGSAP(
    () => {
      const sec = heroRef.current;
      const canvas = framesRef.current;
      if (!sec || !canvas) return;

      const cfg = isPhone() ? FRAMES.mobile : FRAMES.desktop;
      const N = cfg.count;
      const framePath = (i: number) => `${cfg.dir}/${String(i + 1).padStart(3, "0")}.webp`;
      const imgs: HTMLImageElement[] = new Array(N);

      /** The fractional frame the canvas currently shows (−1 = nothing yet). */
      let curF = -1;
      const ok = (im?: HTMLImageElement) => !!im && im.complete && im.naturalWidth > 0;
      const nearest = (idx: number) => {
        for (let d = 0; d < N; d++) {
          if (ok(imgs[idx - d])) return imgs[idx - d];
          if (ok(imgs[idx + d])) return imgs[idx + d];
        }
        return null;
      };

      // Paint one frame at a given opacity. The canvas backing is the frame's
      // OWN pixel size, so this is a 1:1 copy — no per-frame resample, the single
      // most expensive thing a scrubbed canvas can do. The cover-fit and the
      // Retina upscale are handed to the GPU via the element's CSS object-fit.
      const paint = (img: HTMLImageElement | null, alpha: number) => {
        if (!img || !img.naturalWidth) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      };

      // Render a FRACTIONAL frame position by cross-fading the two frames it lies
      // between — so the picture flows continuously as the scroll moves, like
      // video, instead of snapping frame-to-frame. Still zero decode-on-seek: the
      // frames are already in memory, we just alpha-blend two of them.
      const render = (f: number) => {
        const fc = Math.max(0, Math.min(N - 1, f));
        const i0 = Math.floor(fc);
        const i1 = Math.min(N - 1, i0 + 1);
        const t = fc - i0;
        paint(ok(imgs[i0]) ? imgs[i0] : nearest(i0), 1);
        if (i1 !== i0 && t > 0.001 && ok(imgs[i1])) paint(imgs[i1], t);
        curF = fc;
      };

      // Fixed backing = the frame's native pixels (not the Retina viewport), so
      // every draw is a 1:1 copy. CSS object-fit:cover + the GPU do the scaling.
      const sizeCanvas = () => {
        if (canvas.width !== cfg.w) canvas.width = cfg.w;
        if (canvas.height !== cfg.h) canvas.height = cfg.h;
        render(curF < 0 ? 0 : curF);
      };

      // Kick off every frame at once (HTTP/2 multiplexes them). The first frame
      // is high-priority so the opening paints immediately; as each other frame
      // arrives it repaints the current one if it just replaced a fallback.
      for (let i = 0; i < N; i++) {
        const img = new Image();
        img.decoding = "async";
        if (i === 0) img.setAttribute("fetchpriority", "high");
        img.onload = () => {
          render(curF < 0 ? 0 : curF);
        };
        img.src = framePath(i);
        imgs[i] = img;
      }

      window.addEventListener("resize", sizeCanvas);
      sizeCanvas();

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const glow = { v: 0 };
      const setGlow = () => {
        waveTop.current?.setGlow(glow.v);
        waveBottom.current?.setGlow(glow.v);
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 2.4 : 3),
          scrub: 0.7,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // The film is held on frame 0 (the empty plot) through the OPENING, then
      // scrubs the WHOLE sequence — first frame to last — across the rest of the
      // pin. One continuous pass from nothing built to finished, like the film.
      const state = { f: 0 };
      render(0);
      tl.to(state, { f: N - 1, ease: "none", duration: 1 - OPEN, onUpdate: () => render(state.f) }, OPEN);

      if (reduce) {
        tl.to([topRef.current], { yPercent: -100, ease: "none", duration: OPEN }, 0)
          .to([bottomRef.current], { yPercent: 100, ease: "none", duration: OPEN }, 0)
          .to(seamRef.current, { opacity: 0, ease: "none", duration: OPEN * 0.6 }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 0.4 }, OPEN);
      } else {
        // 1) THE PLASTER QUICKENS — as the opening begins, the living field's gold
        //    veins brighten and the shimmer runs faster (uGlow), then eases back
        //    as the halves fly off. No flash — just the plaster coming alive.
        tl.to(glow, { v: 1, ease: "power2.out", duration: OPEN * 0.7, onUpdate: setGlow }, 0.01)
          .to(glow, { v: 0.35, ease: "sine.inOut", duration: OPEN * 0.6, onUpdate: setGlow }, OPEN * 0.7)
          .to(seamRef.current, { opacity: 0, ease: "power1.out", duration: OPEN * 0.35 }, 0.02)
          // 2) THE OPENING — the plaster parts from the centre, quick and smooth;
          //    ANIMA rises, RESIDENCES descends, the empty plot widens between them.
          //    inOut so it eases in AND settles out — no hard stop, no stutter.
          .to(topRef.current, { yPercent: -102, ease: "power3.inOut", duration: OPEN }, 0.02)
          .to(bottomRef.current, { yPercent: 102, ease: "power3.inOut", duration: OPEN }, 0.02)
          .fromTo(framesRef.current, { scale: 1.1 }, { scale: 1, ease: "power2.out", duration: OPEN + 0.12 }, 0.02)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 0.35 }, OPEN * 0.5);
      }

      ScrollTrigger.refresh();

      return () => {
        window.removeEventListener("resize", sizeCanvas);
      };
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-frames/desktop/001.webp" type="image/webp" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-frames/mobile/001.webp" type="image/webp" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* z1 — the film (with its grade), revealed as the plaster parts and
             scrubbed frame-by-frame by the scroll — a preloaded image sequence */}
      <div className="hero-openfilm" aria-hidden>
        {/* the canvas the visitor actually sees — each scroll step paints one
            preloaded frame here, so the picture advances with zero decode lag */}
        <canvas ref={framesRef} className="hero-frames" aria-hidden />
        <div className="cine-vignette" aria-hidden />
        <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />
      </div>

      {/* z2 — the top half of the plaster, carrying ANIMA upward */}
      <div ref={topRef} className="hero-half hero-half--top" aria-hidden>
        <WaveCanvas ref={waveTop} className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-top">
          <span className="hw-line hw-anima">ANIMA</span>
        </div>
      </div>

      {/* z2 — the bottom half, carrying RESIDENCES downward */}
      <div ref={bottomRef} className="hero-half hero-half--bottom" aria-hidden>
        <WaveCanvas ref={waveBottom} className="hero-bg-canvas" startTime={start} />
        <div className="hero-bg-fallback" />
        <div className="hero-word-bottom">
          <span className="hw-sub">
            <span className="hw-rule" />
            <span className="hw-line hw-res">RESIDENCES</span>
            <span className="hw-rule" />
          </span>
        </div>
      </div>

      {/* z3 — the seam: a gold hairline that gives way as the plaster opens */}
      <div ref={seamRef} className="hero-seamline" aria-hidden />

      {/* Nav legibility */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
