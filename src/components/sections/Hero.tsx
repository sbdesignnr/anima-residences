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

/** The share of the pinned scroll spent pushing INTO the I, before the film scrubs. */
const INTRO = 0.5;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const iRef = useRef<HTMLElement>(null);
  const waveRef = useRef<WaveHandle>(null);

  /**
   * Everything the canvas needs to paint the I-window: the glyph's centre (also
   * the wordmark's vanishing point), its font, and how far it must grow for the
   * stem alone to fill the screen. Measured from the real <i>, never guessed.
   */
  const geom = useRef({ cx: 0, cy: 0, F: 160, family: "serif", weight: "600", grow: 60 });
  const dpr = useRef(1);
  /** Live dive state the render loop reads: opacity of the window, and its scale. */
  const op = useRef(0);
  const g = useRef(1);
  const active = useRef(false);
  const raf = useRef(0);

  /** Cover-fit the current video frame into w×h. */
  const drawCover = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    const s = Math.max(W / v.videoWidth, H / v.videoHeight);
    const dw = v.videoWidth * s;
    const dh = v.videoHeight * s;
    try {
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } catch {
      /* frame not decodable yet */
    }
  };

  /**
   * Paint the window: the video, kept only where the letter I is. Because the I
   * is drawn here in the wordmark's own font at the measured glyph centre, the
   * video sits exactly on the real white I — the same letter, filling with film
   * and growing — never a second glyph beside it. Past `grow`, the stem covers
   * the frame and the clip is dropped: pure film.
   */
  const render = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const o = op.current;
    if (o <= 0.001) return;

    const { cx, cy, F, family, weight, grow } = geom.current;
    const d = dpr.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = o;
    drawCover(ctx, W, H);

    if (g.current < grow * 0.999) {
      // keep the film only inside the glyph (a hair larger, to cover the white I)
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${weight} ${F * g.current * 1.05 * d}px ${family}`;
      ctx.fillText("I", cx * d, cy * d);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = 1;
  };

  const loop = () => {
    if (!active.current) {
      raf.current = 0;
      return;
    }
    render();
    raf.current = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf.current && active.current) raf.current = requestAnimationFrame(loop);
  };

  /**
   * Measure the I. Its centre is the growth origin and the wordmark's vanishing
   * point; from its stem width we learn how far the window must grow to fill the
   * screen. The canvas is sized to the viewport here too.
   */
  const measure = () => {
    const sec = heroRef.current;
    const el = iRef.current;
    const cv = canvasRef.current;
    if (!sec || !el || !cv) return;

    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const F = parseFloat(cs.fontSize) || 160;
    const ls = parseFloat(cs.letterSpacing) || 0; // trailing space sits to the glyph's right
    const cx = r.left + r.width / 2 - ls / 2;
    const cy = r.top + r.height / 2;
    const vw = sec.clientWidth || 1;
    const vh = sec.clientHeight || 1;

    // Stem width, as a fraction of font-size — the narrow waist that must clear
    // the screen (the serifs clear long before).
    let stemRatio = 0.12;
    try {
      const S = 220;
      const oc = document.createElement("canvas");
      const octx = oc.getContext("2d")!;
      octx.font = `${cs.fontWeight} ${S}px ${cs.fontFamily}`;
      const m = octx.measureText("I");
      const left = m.actualBoundingBoxLeft ?? 0;
      const right = m.actualBoundingBoxRight ?? m.width;
      const asc = m.actualBoundingBoxAscent ?? S * 0.7;
      const desc = m.actualBoundingBoxDescent ?? 0;
      const gw = Math.max(1, Math.ceil(left + right));
      const gh = Math.max(1, Math.ceil(asc + desc));
      oc.width = gw;
      oc.height = gh;
      octx.font = `${cs.fontWeight} ${S}px ${cs.fontFamily}`;
      octx.textBaseline = "alphabetic";
      octx.fillStyle = "#fff";
      octx.fillText("I", left, asc);
      const row = octx.getImageData(0, Math.floor(gh / 2), gw, 1).data;
      let f = -1, l = -1;
      for (let x = 0; x < gw; x++) {
        if (row[x * 4 + 3] > 128) {
          if (f < 0) f = x;
          l = x;
        }
      }
      if (f >= 0) stemRatio = (l - f + 1) / S;
    } catch {
      /* keep the default */
    }

    geom.current = {
      cx,
      cy,
      F,
      family: cs.fontFamily,
      weight: cs.fontWeight || "600",
      grow: Math.max((vw / (F * stemRatio)) * 1.12, (vh / F) * 1.1),
    };

    const d = Math.min(window.devicePixelRatio || 1, 2);
    dpr.current = d;
    cv.width = Math.round(vw * d);
    cv.height = Math.round(vh * d);
    cv.style.width = vw + "px";
    cv.style.height = vh + "px";

    sec.style.setProperty("--ix", ((cx / vw) * 100).toFixed(2) + "%");
    sec.style.setProperty("--iy", ((cy / vh) * 100).toFixed(2) + "%");

    render();
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

  // ── Scroll: the white I fills with film, then that I grows into the screen ──
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
            render();
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
      const state = { op: 0, g: 1 };
      const mark = () => {
        op.current = state.op;
        g.current = state.g;
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
          onToggle: (self) => {
            active.current = self.isActive;
            if (self.isActive) kick();
          },
        },
      });
      active.current = true;
      kick();

      if (reduce) {
        // Least motion: the window opens whole, the plaster gives way, no dive.
        state.g = geom.current.grow;
        tl.to(state, { op: 1, ease: "none", duration: INTRO * 0.6, onUpdate: mark }, 0)
          .to([creamRef.current, wordRef.current], { opacity: 0, ease: "none", duration: INTRO }, 0)
          .fromTo(finalRef.current, { opacity: 0 }, { opacity: 1, ease: "none", duration: INTRO }, 0)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0);
      } else {
        // 1) THE FILL — the white I dissolves as the film rises inside that very
        //    glyph. The wordmark holds still so the two coincide exactly.
        const FILL = INTRO * 0.34;
        const DIVE = INTRO - FILL;
        tl
          .to(state, { op: 1, ease: "power1.out", duration: FILL, onUpdate: mark }, 0)
          .to(iRef.current, { opacity: 0, ease: "power1.out", duration: FILL }, 0)
          // 2) THE DIVE — the video-filled I grows from its centre until the stem
          //    is the whole screen; the wordmark rushes forward (vanishing point
          //    on the I) so A, N, M, A sweep off the edges; the plaster bleaches.
          .to(state, { g: () => geom.current.grow, ease: "power2.in", duration: DIVE, onUpdate: mark }, FILL)
          .to(wordRef.current, { z: 660, ease: "power2.in", duration: DIVE }, FILL)
          .to(creamRef.current, { z: 320, scale: 1.16, ease: "power2.in", duration: DIVE }, FILL)
          .to(dive, { v: 1, ease: "power2.in", duration: DIVE, onUpdate: () => waveRef.current?.setDive(dive.v) }, FILL)
          .to(wordRef.current, { opacity: 0, ease: "power1.in", duration: DIVE * 0.5 }, FILL + DIVE * 0.5)
          .to(creamRef.current, { opacity: 0, ease: "power1.in", duration: DIVE * 0.5 }, FILL + DIVE * 0.5)
          .fromTo(finalRef.current, { opacity: 0 }, { opacity: 1, ease: "none", duration: DIVE }, FILL);
      }

      // ── INTRO → 1: the film, scrubbed (canvas paints each seeked frame) ──
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
      video.addEventListener("seeked", render);

      const onGesture = () => prime();
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("touchstart", onGesture, { once: true });

      return () => {
        active.current = false;
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("seeked", render);
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

      {/* z0 — the video, hidden. It is only a frame source for the canvas, so it
             never composites over anything and cannot leak through on Safari. */}
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

      {/* z2 — the living plaster, flying past on the dive */}
      <div ref={creamRef} className="hero-cream" aria-hidden>
        <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
        <div className="hero-bg-fallback" />
      </div>

      {/* z3 — the white wordmark. Its I dissolves as the film fills that glyph. */}
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

      {/* z4 — the canvas: the video painted and clipped to the I, growing into
             the screen. A canvas, so Safari cannot leak the video past its mask. */}
      <canvas ref={canvasRef} className="hero-ivideo" aria-hidden />

      {/* z5 — the cinematic grade over the arrived film */}
      <div ref={finalRef} className="hero-final" style={{ opacity: 0 }} aria-hidden>
        <div className="cine-vignette" aria-hidden />
        <div className="cine-grain" aria-hidden />
      </div>

      {/* Nav legibility — over cream at the top, over the film once arrived. */}
      <div className="hero-topscrim" aria-hidden />
    </section>
  );
}
