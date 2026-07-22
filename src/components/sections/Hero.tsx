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
  desktop: { dir: "/images/hero-frames/desktop", count: 203 },
  mobile: { dir: "/images/hero-frames/mobile", count: 132 },
};

/** The share of the pinned scroll spent on the opening, before the film scrubs on. */
const INTRO = 0.5;

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

      // Paint one frame cover-fit at a given opacity.
      const paint = (img: HTMLImageElement | null, alpha: number) => {
        if (!img || !img.naturalWidth) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // The frames are 1080p; a Retina canvas is larger, so ask for the best
        // resampling the browser has rather than the default (fastest) one.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.globalAlpha = alpha;
        const W = canvas.width, H = canvas.height;
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
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

      const sizeCanvas = () => {
        const d = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(window.innerWidth * d));
        canvas.height = Math.max(1, Math.round(window.innerHeight * d));
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

      // The film scrubs across the WHOLE pinned scroll: it is revealed as the
      // plaster parts and then advances frame-by-frame with the scroll.
      const state = { f: 0 };
      tl.to(state, { f: N - 1, ease: "none", duration: 1, onUpdate: () => render(state.f) }, 0);

      if (reduce) {
        tl.to([topRef.current], { yPercent: -100, ease: "none", duration: 1 }, 0)
          .to([bottomRef.current], { yPercent: 100, ease: "none", duration: 1 }, 0)
          .to(seamRef.current, { opacity: 0, ease: "none", duration: 0.3 }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 1 }, 0);
      } else {
        // 1) THE PLASTER QUICKENS — as the opening begins, the living field's gold
        //    veins brighten and the shimmer runs faster (uGlow), then eases back
        //    as the halves fly off. No flash — just the plaster coming alive.
        tl.to(glow, { v: 1, ease: "power2.out", duration: 0.34, onUpdate: setGlow }, 0.02)
          .to(glow, { v: 0.4, ease: "sine.inOut", duration: 0.3, onUpdate: setGlow }, 0.42)
          .to(seamRef.current, { opacity: 0, ease: "power1.out", duration: 0.16 }, 0.05)
          // 2) THE OPENING — the plaster parts from the centre; ANIMA rises,
          //    RESIDENCES descends, and the film widens between them.
          .to(topRef.current, { yPercent: -102, ease: "power2.in", duration: INTRO }, 0.05)
          .to(bottomRef.current, { yPercent: 102, ease: "power2.in", duration: INTRO }, 0.05)
          .fromTo(framesRef.current, { scale: 1.12 }, { scale: 1, ease: "power2.out", duration: INTRO + 0.1 }, 0.05)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.26, ease: "none", duration: 0.4 }, INTRO * 0.55)
          // 3) hold on the film for the rest of the pin
          .to({}, { duration: 1 - INTRO }, INTRO);
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
