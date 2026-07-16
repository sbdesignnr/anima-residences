"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const VIDEO_FPS = 12;
const isPhone = () => window.matchMedia("(max-width: 767px)").matches;
const HERO_MOBILE = media.heroMobile;
const MOBILE_FILL = HERO_MOBILE.w / HERO_MOBILE.h <= 0.62;

const SOURCES: { src: string; type: string; media: string }[] = [
  { src: "/videos/hero-mobile.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(max-width: 767px)" },
  { src: "/videos/hero-mobile.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  { src: "/videos/hero-desktop.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(min-width: 768px)" },
  { src: "/videos/hero-desktop.mp4", type: "video/mp4", media: "(min-width: 768px)" },
];

const posterFor = () =>
  isPhone() ? "/images/hero-poster-mobile.avif" : "/images/hero-poster.avif";

/** The share of the pinned scroll spent pushing INTO the I; the rest scrubs the film. */
const INTRO = 0.42;
/** The clip at rest — collapsed to nothing, so the white I is pristine until scroll. */
const REST_SCALE = 0.001;

type Pt = [number, number];

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLElement>(null);
  const waveRef = useRef<WaveHandle>(null);

  /**
   * The clip is the letter I itself: its outline is traced from the real glyph
   * (Hero renders the I to a canvas and reads its silhouette), placed on the
   * measured I, and grown about the I's centre. `grow` is how far it must scale
   * for the stem alone to fill the screen.
   */
  const geom = useRef({ cx: 0, cy: 0, base: [] as Pt[], grow: 60 });
  /** Live clip scale the timeline drives (kept so a resize can re-apply it). */
  const clip = useRef(REST_SCALE);

  /** Trace the real glyph to a polygon (viewport px, centred on the I). */
  const buildPoly = (cx: number, cy: number, F: number, family: string, weight: string): Pt[] => {
    const SUP = 3;
    const Fp = F * SUP;
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return [];
    probe.font = `${weight} ${Fp}px ${family}`;
    const m = probe.measureText("I");
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? m.width;
    const asc = m.actualBoundingBoxAscent ?? Fp * 0.7;
    const desc = m.actualBoundingBoxDescent ?? 0;
    const gw = Math.max(1, Math.ceil(left + right));
    const gh = Math.max(1, Math.ceil(asc + desc));

    const cv = document.createElement("canvas");
    cv.width = gw;
    cv.height = gh;
    const ctx = cv.getContext("2d");
    if (!ctx) return [];
    ctx.font = `${weight} ${Fp}px ${family}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    ctx.fillText("I", left, asc);
    const px = ctx.getImageData(0, 0, gw, gh).data;

    // Each row of an I is a single horizontal run, so the left/right ink edges
    // per row ARE its exact silhouette — the serifs' width and the stem's waist.
    const leftEdge: Pt[] = [];
    const rightEdge: Pt[] = [];
    const step = Math.max(1, Math.floor(gh / 56));
    for (let y = 0; y < gh; y += step) {
      let lx = -1, rx = -1;
      for (let x = 0; x < gw; x++) {
        if (px[(y * gw + x) * 4 + 3] > 128) {
          if (lx < 0) lx = x;
          rx = x;
        }
      }
      if (lx >= 0) {
        leftEdge.push([lx, y]);
        rightEdge.push([rx + 1, y]);
      }
    }
    if (!leftEdge.length) return [];
    const ring = [...leftEdge, ...rightEdge.reverse()];
    // Centre on the actual INK, not the canvas box: the I has no descender, so
    // the box centre sits below the glyph and would drop the clip low.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [gx, gy] of ring) {
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
    }
    const inkCx = (minX + maxX) / 2;
    const inkCy = (minY + maxY) / 2;
    // → viewport px, the glyph's ink centred on the measured I centre
    return ring.map(([gx, gy]) => [cx + (gx - inkCx) / SUP, cy + (gy - inkCy) / SUP] as Pt);
  };

  /** Scale the traced I about its centre and clip the video to it. */
  const applyClip = (scale: number) => {
    const v = videoRef.current;
    const { cx, cy, base } = geom.current;
    if (!v || !base.length) return;
    const pts = base.map(([x, y]) => `${(cx + (x - cx) * scale).toFixed(1)}px ${(cy + (y - cy) * scale).toFixed(1)}px`);
    const poly = `polygon(${pts.join(",")})`;
    v.style.clipPath = poly;
    (v.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = poly;
  };

  /**
   * Measure the I: its centre (the growth origin and the wordmark's vanishing
   * point), the traced outline, and how far to grow to fill the screen.
   */
  const measure = () => {
    const sec = heroRef.current;
    const el = iRef.current;
    if (!sec || !el) return;

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const F = parseFloat(cs.fontSize) || 160;
    const ls = parseFloat(cs.letterSpacing) || 0; // trailing space sits to the glyph's right
    const cx = r.left + r.width / 2 - ls / 2;
    // The line box carries the font's descent space below the cap I, so its centre
    // sits a touch low; lift the clip onto the glyph's true optical middle.
    const cy = r.top + r.height / 2 - F * 0.05;
    const vw = sec.clientWidth || 1;
    const vh = sec.clientHeight || 1;

    const base = buildPoly(cx, cy, F, cs.fontFamily, cs.fontWeight || "600");

    // Grow until the stem (the narrowest run, near the vertical middle) clears
    // the screen; the serifs clear well before.
    let stem = F * 0.12;
    if (base.length) {
      const midY = cy;
      let nearest = Infinity;
      let w = stem;
      // pair up left/right edges by row via the ring's symmetry
      const half = base.length / 2;
      for (let i = 0; i < half; i++) {
        const l = base[i];
        const rgt = base[base.length - 1 - i];
        const dy = Math.abs((l[1] + rgt[1]) / 2 - midY);
        if (dy < nearest) {
          nearest = dy;
          w = Math.abs(rgt[0] - l[0]);
        }
      }
      stem = Math.max(2, w);
    }
    geom.current = { cx, cy, base, grow: Math.max((vw / stem) * 1.15, (vh / (F * 1.02)) * 1.15) };

    sec.style.setProperty("--ix", ((cx / vw) * 100).toFixed(2) + "%");
    sec.style.setProperty("--iy", ((cy / vh) * 100).toFixed(2) + "%");

    applyClip(clip.current);
  };

  // ── The wordmark settles onto the plaster on load. ──
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.fonts?.ready) document.fonts.ready.then(measure);
      measure();

      if (reduce) {
        gsap.set(".hw-line", { opacity: 1, y: 0 });
        gsap.set(".hw-rule", { scaleX: 1 });
        return;
      }
      gsap
        .timeline({ delay: 0.25 })
        .fromTo(
          ".hw-line",
          { opacity: 0, y: 34, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.16, ease: "power3.out" },
          0
        )
        .fromTo(".hw-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power4.inOut" }, 0.5);
    },
    { scope: heroRef }
  );

  // ── Scroll: the white I opens into the film, the I grows in, then it scrubs ──
  useGSAP(
    () => {
      const video = videoRef.current;
      const sec = heroRef.current;
      if (!video || !sec) return;

      video.poster = posterFor();
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      applyClip(REST_SCALE);

      // Wake the decoder once so scroll-seeks paint immediately (Safari needs a
      // play before a seeked frame will render); then hold on frame 0.
      let primed = false;
      const prime = () => {
        if (primed) return;
        const p = video.play();
        if (p) {
          p.then(() => {
            video.pause();
            video.currentTime = 0.001;
            primed = true;
          }).catch(() => {});
        } else {
          video.pause();
          primed = true;
        }
      };

      const scrub = { t: 0 };
      let lastFrame = -1;
      const applySeek = () => {
        if (video.readyState < 1 || video.seeking) return;
        const d = video.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        const maxFrame = Math.floor(d * VIDEO_FPS) - 1;
        const frame = Math.max(0, Math.min(Math.round(scrub.t * VIDEO_FPS), maxFrame));
        if (frame === lastFrame) return;
        lastFrame = frame;
        video.currentTime = (frame + 0.5) / VIDEO_FPS;
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dive = { v: 0 };
      const state = { s: REST_SCALE };
      const applyState = () => {
        clip.current = state.s;
        applyClip(state.s);
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 2.2 : 3),
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measure,
        },
      });

      // The film scrubs across the WHOLE pinned scroll, so it plays by scroll
      // both as the camera enters the I and once inside it.
      tl.to(scrub, {
        t: () => (Number.isFinite(video.duration) ? video.duration : 0),
        ease: "none",
        duration: 1,
        onUpdate: applySeek,
      }, 0);

      if (reduce) {
        state.s = geom.current.grow;
        applyState();
        tl.to(".hw-line", { opacity: 0, ease: "none", duration: 0.4 }, 0)
          .to(creamRef.current, { opacity: 0, ease: "none", duration: 0.5 }, 0)
          .fromTo(finalRef.current, { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.5 }, 0)
          .to(dive, { v: 1, ease: "none", duration: 0.5, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0);
      } else {
        // The I opens into the film and grows toward you across the whole INTRO,
        // accelerating in. The white I dissolves early (the reveal); A, N, M, A
        // rush forward and sweep off; the plaster parallaxes and bleaches.
        const REVEAL = INTRO * 0.42;
        tl
          .to(state, { s: () => geom.current.grow, ease: "power2.in", duration: INTRO, onUpdate: applyState }, 0)
          .to(iRef.current, { opacity: 0, ease: "power1.out", duration: REVEAL }, 0)
          .to(wordRef.current, { z: 680, ease: "power2.in", duration: INTRO }, 0)
          .to(creamRef.current, { z: 320, scale: 1.16, ease: "power2.in", duration: INTRO }, 0)
          .to(dive, { v: 1, ease: "power2.in", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0)
          .to(wordRef.current, { opacity: 0, ease: "power1.in", duration: INTRO * 0.45 }, INTRO * 0.55)
          .to(creamRef.current, { opacity: 0, ease: "power1.in", duration: INTRO * 0.45 }, INTRO * 0.55)
          .fromTo(finalRef.current, { opacity: 0 }, { opacity: 1, ease: "none", duration: INTRO * 0.6 }, INTRO * 0.4);
      }

      const onLoaded = () => {
        prime();
        ScrollTrigger.refresh();
      };
      if (video.readyState >= 1) onLoaded();
      video.addEventListener("loadedmetadata", onLoaded);

      const onGesture = () => prime();
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("touchstart", onGesture, { once: true });

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      };
    },
    { scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`hero-persp relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* z2 — the living plaster, flying past on the dive (and occluding the video) */}
      <div ref={creamRef} className="hero-cream" aria-hidden>
        <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
        <div className="hero-bg-fallback" />
      </div>

      {/* z4 — the film itself, shown and scrubbed, clipped to the letter I. Clipped
             just inside the white I at rest, so the wordmark's I hides it until it
             opens. clip-path on a <video> is honoured by Safari; a mask is not. */}
      <video
        ref={videoRef}
        className="hero-src"
        autoPlay={false}
        muted
        playsInline
        controls={false}
        preload="auto"
        aria-hidden
      >
        {SOURCES.map((s) => (
          <source key={s.src} src={s.src} type={s.type} media={s.media} />
        ))}
      </video>

      {/* z5 — the white wordmark, over the film. Its I dissolves so the film shows
             through that very glyph; then the whole word rushes forward and away. */}
      <div ref={wordRef} className="hero-word" aria-hidden>
        <span className="hw-line hw-anima">
          AN<i ref={iRef} className="hw-i">I</i>MA
        </span>
        <span className="hw-sub">
          <span className="hw-rule" />
          <span className="hw-line hw-res">RESIDENCES</span>
          <span className="hw-rule" />
        </span>
      </div>

      {/* z6 — the cinematic grade over the arrived film */}
      <div ref={finalRef} className="hero-final" style={{ opacity: 0 }} aria-hidden>
        <div className="cine-vignette" aria-hidden />
        <div className="cine-grain" aria-hidden />
      </div>

      {/* Nav legibility — over cream at the top, over the film once arrived. */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
