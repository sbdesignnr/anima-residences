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

const SOURCES: { src: string; type: string; media: string }[] = [
  { src: "/videos/hero-mobile.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(max-width: 767px)" },
  { src: "/videos/hero-mobile.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  // Desktop scrub source is H.264 only — it seeks smoothly in every browser
  // (Safari included); the file is all-keyframe (keyint=1) so each scroll frame
  // decodes exactly one frame.
  { src: "/videos/hero_desktop.mp4", type: "video/mp4", media: "(min-width: 768px)" },
];

const posterFor = () =>
  isPhone() ? "/images/hero-poster-mobile.avif" : "/images/hero-poster.avif";

/** Every source is encoded at this rate with every frame a keyframe, so scroll
 *  quantises to whole frames and each seek is a single-frame decode. */
const VIDEO_FPS = 12;

/** The share of the pinned scroll spent on the opening, before the film scrubs on. */
const INTRO = 0.5;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
      const video = videoRef.current;
      const sec = heroRef.current;
      if (!video || !sec) return;

      video.poster = posterFor();
      const canvas = framesRef.current;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.pause();

      // Draw the video's CURRENT frame onto the canvas (cover-fit). The canvas is
      // what the visitor sees, so the picture updates even where Safari would not
      // repaint a paused <video> on seek.
      const draw = () => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx || !video.videoWidth) return;
        const W = canvas.width;
        const H = canvas.height;
        const s = Math.max(W / video.videoWidth, H / video.videoHeight);
        const dw = video.videoWidth * s;
        const dh = video.videoHeight * s;
        try {
          ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } catch {
          /* frame not ready */
        }
      };
      const sizeCanvas = () => {
        if (!canvas) return;
        // Size from the viewport (the hero is full-screen) rather than the
        // element box, which may not be laid out yet when this first runs.
        const d = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(window.innerWidth * d));
        canvas.height = Math.max(1, Math.round(window.innerHeight * d));
        draw();
      };

      // Wake the decoder once — Safari won't produce a seeked frame until a play
      // has happened — then hold. The film never auto-plays; scroll drives it.
      let primed = false;
      const prime = () => {
        if (primed) return;
        const p = video.play();
        if (p) {
          p.then(() => {
            video.pause();
            primed = true;
            draw();
          }).catch(() => {});
        } else {
          video.pause();
          primed = true;
        }
      };

      // Scroll → target time. Seeks are SERIALISED: we only issue the next seek
      // once the last finished, always toward the latest target — so a slow
      // Safari seek can never strand us on an old frame.
      const target = { t: 0 };
      const applyTarget = () => {
        if (video.readyState < 2 || video.seeking) return;
        const d = video.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        const maxFrame = Math.floor(d * VIDEO_FPS) - 1;
        const frame = Math.max(0, Math.min(Math.round(target.t * VIDEO_FPS), maxFrame));
        const ct = (frame + 0.5) / VIDEO_FPS;
        if (Math.abs(video.currentTime - ct) < 0.5 / VIDEO_FPS) return;
        video.currentTime = ct;
      };
      const onSeeked = () => {
        draw();
        applyTarget();
      };
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("loadeddata", draw);
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
          onToggle: (self) => {
            if (self.isActive) prime();
          },
        },
      });

      // The film scrubs across the WHOLE pinned scroll: it is revealed as the
      // plaster parts and then advances frame-by-frame with the scroll.
      tl.to(
        target,
        {
          t: () => (Number.isFinite(video.duration) ? video.duration : 0),
          ease: "none",
          duration: 1,
          onUpdate: applyTarget,
        },
        0
      );

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

      const onLoaded = () => {
        prime();
        sizeCanvas();
        ScrollTrigger.refresh();
      };
      if (video.readyState >= 1) onLoaded();
      video.addEventListener("loadedmetadata", onLoaded);

      // Prime on the first real interaction of any kind — wheel/trackpad scroll
      // included, since that is how a desktop visitor first moves the page.
      const onGesture = () => {
        prime();
        applyTarget();
      };
      const gestures = ["wheel", "pointerdown", "touchstart", "keydown"];
      gestures.forEach((g) => window.addEventListener(g, onGesture, { once: true, passive: true }));

      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("loadeddata", draw);
        window.removeEventListener("resize", sizeCanvas);
        gestures.forEach((g) => window.removeEventListener(g, onGesture));
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

      {/* z1 — the film (with its grade), revealed as the plaster parts and
             scrubbed frame-by-frame by the scroll — never auto-played */}
      <div className="hero-openfilm" aria-hidden>
        <video ref={videoRef} className="hero-openvid" autoPlay={false} muted playsInline controls={false} preload="auto" aria-hidden>
          {SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} media={s.media} />
          ))}
        </video>
        {/* the canvas the visitor actually sees — each seeked frame is drawn here,
            so the picture advances on scroll even where Safari would not repaint
            the paused <video> itself */}
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
