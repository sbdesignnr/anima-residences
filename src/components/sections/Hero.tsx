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

/** The share of the pinned scroll spent pushing INTO the I, before the film scrubs. */
const INTRO = 0.5;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLElement>(null);
  const waveRef = useRef<WaveHandle>(null);
  /**
   * The film is masked to the letter I. The mask is the REAL glyph, drawn to a
   * canvas in the wordmark's own font, so the video window matches the I exactly.
   * `bw/bh` are its on-screen size, `cx/cy` the I's centre (the growth origin),
   * and `grow` how far the mask must scale for the stem to swallow the screen.
   */
  const geom = useRef({ cx: 0, cy: 0, bw: 40, bh: 200, grow: 60, ready: false });

  /** Render the letter I to a canvas in the wordmark's font → a mask image. */
  const buildMask = () => {
    const el = iRef.current;
    const film = filmRef.current;
    if (!el || !film) return;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize) || 160;
    const SUP = 4; // supersample so the glyph edge stays crisp while it grows
    const F = fs * SUP;

    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return;
    probe.font = `${cs.fontWeight} ${F}px ${cs.fontFamily}`;
    const m = probe.measureText("I");
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? m.width;
    const asc = m.actualBoundingBoxAscent ?? F * 0.7;
    const desc = m.actualBoundingBoxDescent ?? 0;
    const gw = Math.max(1, Math.ceil(left + right));
    const gh = Math.max(1, Math.ceil(asc + desc));

    const cv = document.createElement("canvas");
    cv.width = gw;
    cv.height = gh;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.font = `${cs.fontWeight} ${F}px ${cs.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    ctx.fillText("I", left, asc);

    // The stem is the narrow waist between the serifs; the window has to grow
    // until THAT clears the screen (the serifs clear long before).
    const row = ctx.getImageData(0, Math.floor(gh / 2), gw, 1).data;
    let first = -1, last = -1;
    for (let x = 0; x < gw; x++) {
      if (row[x * 4 + 3] > 128) {
        if (first < 0) first = x;
        last = x;
      }
    }
    const stem = first >= 0 ? last - first + 1 : gw * 0.12;

    film.style.maskImage = `url(${cv.toDataURL("image/png")})`;
    film.style.webkitMaskImage = `url(${cv.toDataURL("image/png")})`;
    film.style.maskRepeat = "no-repeat";
    film.style.webkitMaskRepeat = "no-repeat";

    geom.current.bw = gw / SUP;
    geom.current.bh = gh / SUP;
    geom.current.ready = true;
    return stem / SUP; // on-screen stem width at base size
  };

  /**
   * Place & size the mask so the glyph is centred on the real I and scaled by k.
   * Growing k opens the I-shaped window; past `grow` the stem alone fills the view.
   */
  const applyGrow = (k: number) => {
    const film = filmRef.current;
    const { cx, cy, bw, bh } = geom.current;
    if (!film) return;
    const w = bw * k;
    const h = bh * k;
    const x = cx - w / 2;
    const y = cy - h / 2;
    film.style.maskSize = `${w}px ${h}px`;
    film.style.webkitMaskSize = `${w}px ${h}px`;
    film.style.maskPosition = `${x}px ${y}px`;
    film.style.webkitMaskPosition = `${x}px ${y}px`;
  };

  /**
   * The window IS the letter I, so everything is measured from that very element:
   * its centre (the growth origin and the wordmark's vanishing point) and the
   * mask glyph itself. From the stem width we learn how far to grow to fill the
   * screen.
   */
  const measure = () => {
    const sec = heroRef.current;
    const el = iRef.current;
    if (!sec || !el) return;

    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const vw = sec.clientWidth || 1;
    const vh = sec.clientHeight || 1;
    geom.current.cx = cx;
    geom.current.cy = cy;

    // Vanishing point for the wordmark's translateZ, so the I stays centred.
    sec.style.setProperty("--ix", ((cx / vw) * 100).toFixed(2) + "%");
    sec.style.setProperty("--iy", ((cy / vh) * 100).toFixed(2) + "%");

    const stem = buildMask() ?? geom.current.bw * 0.12;
    geom.current.grow = Math.max(
      (vw / Math.max(stem, 1)) * 1.15,
      vh / Math.max(geom.current.bh, 1)
    );
    applyGrow(1);
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

  // ── Scroll: the video fills the I, and the I grows until it IS the screen ──
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
      const grow = { g: 1 };
      applyGrow(1);

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
        // Least motion: no dive. The window simply opens and the plaster gives way.
        gsap.set(filmRef.current, { maskImage: "none", WebkitMaskImage: "none" });
        tl.to(filmRef.current, { opacity: 1, ease: "none", duration: INTRO * 0.6 }, 0)
          .to([creamRef.current, wordRef.current], { opacity: 0, ease: "none", duration: INTRO }, 0)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0);
      } else {
        // THE CAMERA INTO THE I.
        //
        // 1) The film fades UP inside the glyph — the white I fills with video.
        // 2) That I-shaped window grows, centred on the I, until the stem alone is
        //    wider than the screen: the camera has gone through the letter and
        //    nothing is left but the film.
        // 3) The wordmark rushes forward (translateZ, vanishing point on the I) so
        //    ANIMA comes at you and A, N, M, A sweep off the edges; the plaster
        //    parallaxes and bleaches, all of it gone as the I fills.
        const FILL = INTRO * 0.4; // how long the white I takes to become video

        tl
          .to(filmRef.current, { opacity: 1, ease: "power1.out", duration: FILL }, 0)
          .to(grow, {
            g: () => geom.current.grow,
            ease: "power2.in",
            duration: INTRO,
            onUpdate: () => applyGrow(grow.g),
          }, 0)
          .to(wordRef.current, { z: 640, ease: "power2.in", duration: INTRO }, 0)
          .to(creamRef.current, { z: 320, scale: 1.16, ease: "power2.in", duration: INTRO }, 0)
          .to(dive, { v: 1, ease: "power2.in", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0)
          .to(wordRef.current, { opacity: 0, ease: "power1.in", duration: INTRO * 0.28 }, INTRO * 0.72)
          .to(creamRef.current, { opacity: 0, ease: "power1.in", duration: INTRO * 0.28 }, INTRO * 0.72)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO * 0.28 }, INTRO * 0.72);
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
      className={`hero-persp relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* z2 — the living plaster, flying past on the dive */}
      <div ref={creamRef} className="hero-cream" aria-hidden>
        <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
        <div className="hero-bg-fallback" />
      </div>

      {/* z3 — the white wordmark. The camera flies into its I; the film window,
             above, fills that very glyph and then grows past it. */}
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

      {/* z4 — the film: a full-screen video masked to the I. Invisible at rest;
             it fills the glyph, then the glyph grows until it is the whole screen. */}
      <div ref={filmRef} className="hero-film" style={{ opacity: 0 }} aria-hidden>
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

      {/* Nav legibility — over cream at the top, over the film once arrived. */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
