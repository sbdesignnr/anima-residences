"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import lqip from "@/lib/lqip.json";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const LQIP_BG: React.CSSProperties = {
  backgroundImage: `url(${lqip["hero-poster"].lqip})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

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

/** The share of the pinned scroll the dive-into-the-I takes before the film runs. */
const INTRO = 0.42;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLElement>(null);
  const waveRef = useRef<WaveHandle>(null);
  /** Where the film-window starts, in px — a touch smaller than the white I, so
      the film first appears INSIDE that very glyph rather than as a second one.
      Held invisible at rest (portal opacity 0), so the opening is a clean ANIMA. */
  const restMi = useRef(140);
  /** The white I's rendered height in px — the size the window fills TO first. */
  const glyphH = useRef(200);
  const maskBuilt = useRef(false);
  /** The glyph stem's width as a fraction of its height — measured off the real
      glyph, so the mask can be grown JUST far enough for the thin stem to clear
      the viewport width (a hand-guessed multiple left the film in a band). */
  const stemRatio = useRef(0.12);

  /**
   * The window is the EXACT glyph, not a drawing of one.
   *
   * A hand-drawn serif-I never matches Cinzel's I — the serifs, the bracketing,
   * the stem taper are all subtly off, and the eye reads it instantly as a
   * SECOND, different I laid over the word. So the mask is rendered from the very
   * same font the wordmark uses: the "I" is drawn to a canvas with .hw-anima's
   * own computed font, tight-cropped to its ink, and handed to the portal as its
   * mask image. Now the film shows through a window that IS the letter.
   */
  const buildMask = () => {
    const portal = portalRef.current;
    const el = iRef.current;
    if (!portal || !el || maskBuilt.current) return;
    const ff = getComputedStyle(el).fontFamily;
    if (!ff) return;
    const R = 512;
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.font = `600 ${R}px ${ff}`;
    const m = ctx.measureText("I");
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? R * 0.3;
    const asc = m.actualBoundingBoxAscent ?? R * 0.72;
    const desc = m.actualBoundingBoxDescent ?? 0;
    const w = Math.max(2, Math.ceil(left + right));
    const h = Math.max(2, Math.ceil(asc + desc));
    if (h < 20) return; // font not ready yet — try again after fonts.ready
    cv.width = w;
    cv.height = h;
    ctx.font = `600 ${R}px ${ff}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("I", left, asc);
    try {
      const row = ctx.getImageData(0, Math.floor(h / 2), w, 1).data;
      let a = -1, z = -1;
      for (let x = 0; x < w; x++) {
        if (row[x * 4 + 3] > 40) { if (a < 0) a = x; z = x; }
      }
      if (a >= 0) stemRatio.current = Math.max(0.04, (z - a + 1) / h);
    } catch { /* same-origin text — never tainted */ }
    const url = `url(${cv.toDataURL("image/png")})`;
    portal.style.webkitMaskImage = url;
    portal.style.maskImage = url;
    maskBuilt.current = true;
  };

  /**
   * Anchor the dive on the real I.
   *
   * The film-window and the fly-past both zoom about the letter I, so where the
   * I actually sits has to be measured, not assumed — its centre drifts with the
   * font size across breakpoints. Written as CSS custom properties the mask and
   * the transforms both read.
   */
  const measure = () => {
    const sec = heroRef.current;
    const el = iRef.current;
    if (!sec || !el) return;
    const r = el.getBoundingClientRect();
    const vw = sec.clientWidth || 1;
    const vh = sec.clientHeight || 1;
    const cx = ((r.left + r.width / 2) / vw) * 100;
    const cy = ((r.top + r.height / 2) / vh) * 100;
    glyphH.current = r.height;
    restMi.current = Math.max(30, r.height * 0.42);
    sec.style.setProperty("--ix", cx.toFixed(2) + "%");
    sec.style.setProperty("--iy", cy.toFixed(2) + "%");
    sec.style.setProperty("--mi", restMi.current.toFixed(1) + "px");
    buildMask();
  };

  // ── The wordmark settles onto the plaster on load. ──
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); buildMask(); });
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

  // ── Scroll: the camera dives into the I, the film grows out of it, then scrubs ──
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
      video.pause();

      let primed = false;
      const prime = () => {
        if (primed) return;
        if (video.readyState === 0) video.load();
        const p = video.play();
        if (p) {
          p.then(() => {
            video.pause();
            primed = true;
          }).catch(() => {
            primed = false;
          });
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

      // How big the I-mask must get for the film to be WHOLE.
      //
      // On screen the STEM is all that covers the centre — the serifs are long
      // gone off the top and bottom — so the stem has to clear the viewport
      // WIDTH. Stem width on screen = stemRatio * --mi, so --mi must reach
      // vw / stemRatio. stemRatio is measured off the real glyph (thin), not
      // guessed; undershoot it and the film ends as a band with page down the sides.
      const endMi = () => Math.max(window.innerWidth / stemRatio.current, window.innerHeight) * 1.18;

      // The growth is deliberately in TWO parts. The whole reveal must not happen
      // the instant you touch the wheel: first the film wells up and fills the
      // white I (so you read "video appearing IN the letter", ANIMA still whole);
      // only in the second half does the camera submerge and the film rush out to
      // fill the screen. FILL = the size at which the window covers the glyph.
      const FILL_AT = 0.46;
      const applyDive = () => {
        const p = dive.v;
        const fill = glyphH.current * 0.74;
        let mi: number;
        if (p <= FILL_AT) {
          mi = restMi.current + (fill - restMi.current) * (p / FILL_AT);
        } else {
          const q = (p - FILL_AT) / (1 - FILL_AT);
          mi = fill + (endMi() - fill) * q * q; // the rush eases IN
        }
        sec.style.setProperty("--mi", mi.toFixed(1) + "px");
        // The plaster stays calm while the I fills, then bleaches as we submerge.
        waveRef.current?.setDive(Math.max(0, (p - 0.4) / 0.6));
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 2 : 3),
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measure,
        },
      });

      if (reduce) {
        // Least motion: the plaster and letters simply give way and the film,
        // which is what the scroll is really for, takes over.
        tl.to([creamRef.current, wordRef.current], { opacity: 0, ease: "none", duration: INTRO * 0.7 }, 0)
          .fromTo(portalRef.current, { opacity: 0 }, { opacity: 1, ease: "none", duration: INTRO * 0.4 }, 0)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: applyDive }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO }, 0);
      } else {
        // The camera dives into the I. The film grows out of it (the mask), the
        // white letters over it dissolve so the film shows through the glyph, and
        // the plaster and the other letters rush the camera and fly past — a slow
        // roll on the whole scene reads as the camera moving, not the picture.
        const P1 = INTRO * FILL_AT; // fill the I
        const P2 = INTRO - P1; // submerge
        tl
          // the dive runs the mask across the whole INTRO (shaped in applyDive)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: applyDive }, 0)
          // the film wells up inside the white I — hidden at rest, quick to appear
          .fromTo(portalRef.current, { opacity: 0 }, { opacity: 1, ease: "power1.out", duration: INTRO * 0.12 }, 0)
          // Phase 1: the scene barely breathes — ANIMA stays whole while the I fills.
          .fromTo(creamRef.current, { scale: 1 }, { scale: 1.07, ease: "power1.in", duration: P1 }, 0)
          .fromTo(wordRef.current, { scale: 1 }, { scale: 1.05, ease: "power1.in", duration: P1 }, 0)
          // Phase 2: the camera submerges — the plaster and letters rush past.
          .to(creamRef.current, { scale: 3.0, rotate: -3, opacity: 0, ease: "power2.in", duration: P2 }, P1)
          .to(wordRef.current, { scale: 3.2, rotate: -3, opacity: 0, ease: "power2.in", duration: P2 }, P1)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: P2 }, P1);
      }

      // ── INTRO → 1: the film, scrubbed ──
      tl.to(
        scrub,
        {
          t: () => (Number.isFinite(video.duration) ? video.duration : 0),
          ease: "none",
          duration: reduce ? 1 : 1 - INTRO,
          onUpdate: applySeek,
        },
        reduce ? 0 : INTRO
      );

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
      className={`relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* z1 — the living plaster ground, behind everything and flying past on the dive */}
      <div ref={creamRef} className="hero-cream" aria-hidden>
        <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
        <div className="hero-bg-fallback" />
      </div>

      {/* z2 — the film, MASKED to the letter I so only the I shows it. The mask
             (--mi) grows on scroll until the film is the whole screen. */}
      <div ref={portalRef} className="hero-portal" style={{ opacity: 0 }} aria-hidden>
        <div className="absolute inset-0" style={{ ...LQIP_BG, backgroundColor: "#181913" }}>
          <div className="hero-letterbox absolute inset-0" />
          <video
            ref={videoRef}
            autoPlay={false}
            muted
            playsInline
            controls={false}
            preload="auto"
            className="hero-video cine-breath"
            style={{ willChange: "transform" }}
          >
            {SOURCES.map((s) => (
              <source key={s.src} src={s.src} type={s.type} media={s.media} />
            ))}
          </video>
        </div>
        <div className="cine-vignette" aria-hidden />
        <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />
      </div>

      {/* Nav legibility — over cream at the top, over the film after the dive. */}
      <div className="hero-topscrim" aria-hidden />

      {/* z3 — the white letters. At rest the I is a clean glyph over the portal;
             on the dive it dissolves and the film shows through it. */}
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
    </section>
  );
}
