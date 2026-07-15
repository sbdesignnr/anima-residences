"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import lqip from "@/lib/lqip.json";
import media from "@/lib/media.json";
import WaveCanvas, { type WaveHandle } from "@/components/ui/WaveCanvas";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// iOS resizes the viewport when the address bar collapses; without this every
// such resize refreshes ScrollTrigger and jolts the pinned hero.
ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * A 24px blurred still of the first video frame, inlined as base64 (~0.2 KB).
 * It paints with the HTML, so the film is already behind the cream scene by the
 * time the dive has any reason to open it.
 */
const LQIP_BG: React.CSSProperties = {
  backgroundImage: `url(${lqip["hero-poster"].lqip})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

/** The encode's frame rate. Seeks are snapped to this grid — see applySeek. */
const VIDEO_FPS = 12;

/** Must agree with the `max-width: 767px` rules in globals.css. */
const isPhone = () => window.matchMedia("(max-width: 767px)").matches;

const HERO_MOBILE = media.heroMobile;
const MOBILE_FILL = HERO_MOBILE.w / HERO_MOBILE.h <= 0.62;

/**
 * The cut and codec, chosen by the BROWSER in the markup — so the download is
 * underway during HTML parse, not after hydration. HEVC before H.264 in each
 * pair; the browser takes the first source it can decode whose media matches.
 */
const SOURCES: { src: string; type: string; media: string }[] = [
  { src: "/videos/hero-mobile.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(max-width: 767px)" },
  { src: "/videos/hero-mobile.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  { src: "/videos/hero-desktop.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(min-width: 768px)" },
  { src: "/videos/hero-desktop.mp4", type: "video/mp4", media: "(min-width: 768px)" },
];

const posterFor = () =>
  isPhone() ? "/images/hero-poster-mobile.avif" : "/images/hero-poster.avif";

/**
 * The share of the pinned scroll the dive takes before the film begins.
 *
 * The cream scene and the film are deliberately NOT cross-faded through each
 * other: the visitor dives through the plaster, it melts into light, and only
 * then does the building answer the scroll. Overlapping the two reads as mud.
 */
const INTRO = 0.4;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveHandle>(null);

  // ── The wordmark settles onto the plaster on load. ──
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  // ── Scroll: the dive, then the film ──
  useGSAP(
    () => {
      const video = videoRef.current;
      if (!video) return;

      video.poster = posterFor();
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.pause();

      // Safari will not repaint a paused video on programmatic seeks until its
      // decoder has been primed by a real play().
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

      const state = { t: 0 };
      let lastFrame = -1;
      const applySeek = () => {
        if (video.readyState < 1 || video.seeking) return;
        const d = video.duration;
        if (!Number.isFinite(d) || d <= 0) return;
        const maxFrame = Math.floor(d * VIDEO_FPS) - 1;
        const frame = Math.max(0, Math.min(Math.round(state.t * VIDEO_FPS), maxFrame));
        if (frame === lastFrame) return;
        lastFrame = frame;
        video.currentTime = (frame + 0.5) / VIDEO_FPS;
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dive = { v: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: () => "+=" + window.innerHeight * (isCoarse() ? 2 : 3),
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      if (reduce) {
        // No dive — the plaster simply gives way to the film. The scroll still
        // drives the film, because that is the content, not the flourish.
        tl.to([bgRef.current, wordRef.current], { opacity: 0, ease: "none", duration: INTRO * 0.6 }, 0)
          .to(dive, { v: 1, ease: "none", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO }, 0);
      } else {
        // ── 0 → INTRO: the camera dives through the plaster ──
        // The wordmark is the nearest thing, so it rushes the camera and passes
        // it (translateZ toward the eye + scale + fade). The ground behind falls
        // away and bleaches into light. The whole scene tilts and rolls a little,
        // which is the camera moving rather than the picture merely scaling.
        tl.to(sceneRef.current, { rotateX: 9, rotateZ: -4, z: 180, ease: "power2.inOut", duration: INTRO }, 0)
          .to(wordRef.current, { z: 640, scale: 2.1, rotateX: 6, opacity: 0, ease: "power2.in", duration: INTRO * 0.82 }, 0)
          .to(bgRef.current, { z: -120, scale: 1.28, opacity: 0, ease: "power2.in", duration: INTRO }, 0)
          .to(dive, { v: 1, ease: "power2.in", duration: INTRO, onUpdate: () => waveRef.current?.setDive(dive.v) }, 0)
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: INTRO }, INTRO * 0.35);
      }

      // ── INTRO → 1: the film, scrubbed ──
      tl.to(
        state,
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
      className={`hero-perspective relative w-full overflow-hidden bg-charcoal ${MOBILE_FILL ? "hero--fill" : "hero--letterbox"}`}
      style={{ height: "100svh", ["--m-aspect" as string]: `${HERO_MOBILE.w} / ${HERO_MOBILE.h}` }}
    >
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      <h1 className="sr-only">Anima Residences</h1>

      {/* ── The film — behind everything, revealed as the plaster melts, then
             scrubbed by scroll. It is loaded from first paint. ── */}
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

      {/* Cinematic grade on the footage, once it shows. */}
      <div className="cine-vignette" aria-hidden />
      <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />
      <div
        className="absolute inset-0 z-[7]"
        style={{ pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%)" }}
      />

      {/* ── The cream scene: a living plaster ground with a raised wordmark. It
             lives in a 3D space (see .hero-perspective) so the dive can fly the
             wordmark past the camera while the ground falls away behind it. ── */}
      <div ref={sceneRef} className="hero-scene" aria-hidden>
        <div ref={bgRef} className="hero-bg">
          <WaveCanvas ref={waveRef} className="hero-bg-canvas" />
          {/* CSS fallback under the canvas — shows if WebGL2 is unavailable. */}
          <div className="hero-bg-fallback" />
          {/* A soft scrim at the very top so the white navigation reads over cream. */}
          <div className="hero-topscrim" />
        </div>

        <div ref={wordRef} className="hero-word">
          <span className="hw-line hw-anima">ANIMA</span>
          <span className="hw-sub">
            <span className="hw-rule" aria-hidden />
            <span className="hw-line hw-res">RESIDENCES</span>
            <span className="hw-rule" aria-hidden />
          </span>
        </div>
      </div>
    </section>
  );
}
