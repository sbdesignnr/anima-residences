"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import lqip from "@/lib/lqip.json";
import media from "@/lib/media.json";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// iOS resizes the viewport when the address bar collapses; without this every
// such resize refreshes ScrollTrigger and jolts the pinned hero.
ScrollTrigger.config({ ignoreMobileResize: true });

const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * A 24px blurred still of the first video frame, inlined as base64 (~0.2 KB).
 * It paints with the HTML — zero requests, zero wait — so the film is already
 * behind the gate by the time the gate has any reason to open.
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

/**
 * How the phone lays the hero out — decided by the phone cut's real aspect,
 * written by the media pipeline (src/lib/media.json).
 */
const HERO_MOBILE = media.heroMobile;
const MOBILE_FILL = HERO_MOBILE.w / HERO_MOBILE.h <= 0.62;

/**
 * The cut, and the codec, chosen by the BROWSER — in the markup, not in an effect.
 *
 * Picking the src in JavaScript meant the fetch could not begin until the bundle
 * had loaded, parsed, hydrated and run: a second or more of a 12 MB download
 * simply not happening yet, on the one element the whole page is waiting for.
 * A <source> list with `media` and `type` is decided during HTML parse, so the
 * bytes are already in flight before React has drawn its first breath.
 *
 * Order matters: the browser takes the FIRST source whose media query matches and
 * whose type it can decode — so HEVC is offered ahead of H.264 in each pair.
 */
const SOURCES: { src: string; type: string; media: string }[] = [
  { src: "/videos/hero-mobile.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(max-width: 767px)" },
  { src: "/videos/hero-mobile.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  { src: "/videos/hero-desktop.hevc.mp4", type: `video/mp4; codecs="hvc1.1.6.L93.B0"`, media: "(min-width: 768px)" },
  { src: "/videos/hero-desktop.mp4", type: "video/mp4", media: "(min-width: 768px)" },
];

/** Each poster is its own encode's first frame, so it shares the crop exactly. */
const posterFor = () =>
  isPhone() ? "/images/hero-poster-mobile.avif" : "/images/hero-poster.avif";

/**
 * The share of the pinned scroll the gate takes before the film begins.
 *
 * The two are deliberately NOT overlapped: the visitor opens the gate, and only
 * then does the building start to rise. Running both at once reads as one messy
 * dissolve — the point of a gate is that something is behind it.
 */
const GATE = 0.3;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const gateTop = useRef<HTMLDivElement>(null);
  const gateBot = useRef<HTMLDivElement>(null);
  const markTop = useRef<HTMLDivElement>(null);
  const markBot = useRef<HTMLDivElement>(null);

  // ── The gate is shut, and draws itself: the seam strikes out across the black,
  //    and the two halves of the name rise and fall away from it. ──
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(".gate-edge", { scaleX: 1 });
        gsap.set([markTop.current, markBot.current], { opacity: 1 });
        return;
      }

      gsap
        .timeline({ delay: 0.35 })
        // Both halves of the seam, struck out from the centre at once — they are
        // laid on top of each other, so it reads as one line drawing itself.
        .fromTo(".gate-edge", { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: "power4.inOut" }, 0)
        // The name is born OUT of the line — ANIMA lifts off it, RESIDENCES
        // settles below it — so the seam reads as the source, not a divider.
        .fromTo(
          markTop.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" },
          0.6
        )
        .fromTo(
          markBot.current,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 1.5, ease: "power3.out" },
          0.75
        );
    },
    { scope: heroRef }
  );

  // ── Scroll: the gate parts, then the film runs ──
  useGSAP(
    () => {
      const video = videoRef.current;
      if (!video) return;

      // The src is NOT set here — the <source> list in the markup already chose
      // it, and the download is already underway. Only the poster is picked in
      // JS, because `poster` takes no media query.
      video.poster = posterFor();

      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.pause();

      // Safari will not repaint a paused video on programmatic `currentTime`
      // seeks until its decoder has been primed by a real play().
      let primed = false;
      const prime = () => {
        if (primed) return;
        if (video.readyState === 0) video.load();
        const p = video.play();
        if (p) {
          p.then(() => {
            video.pause();
            primed = true; // decoder is awake; seeks will now paint on iOS
          }).catch(() => {
            primed = false; // blocked — a later gesture will retry
          });
        } else {
          video.pause();
          primed = true;
        }
      };

      // `scrub` only smooths an ANIMATION, so tween a proxy object rather than
      // writing currentTime straight from onUpdate.
      const state = { t: 0 };
      let lastFrame = -1;

      const applySeek = () => {
        // HAVE_METADATA is enough to issue a seek — requiring HAVE_CURRENT_DATA
        // deadlocks against preload="metadata" (no seek -> no data -> no seek).
        // Never queue a seek on top of a seek: that is what stalls phones.
        if (video.readyState < 1 || video.seeking) return;
        const d = video.duration;
        if (!Number.isFinite(d) || d <= 0) return;

        // The file holds 12 distinct frames per second. Seeking every ~4 ms of
        // video time asked the decoder for the SAME frame four times over. Snap
        // to the frame grid and land mid-frame so rounding never straddles two.
        const maxFrame = Math.floor(d * VIDEO_FPS) - 1;
        const frame = Math.max(0, Math.min(Math.round(state.t * VIDEO_FPS), maxFrame));
        if (frame === lastFrame) return;
        lastFrame = frame;
        video.currentTime = (frame + 0.5) / VIDEO_FPS;
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        // Nobody who asked for less motion wants a gate swinging at them. It is
        // simply already open — but the film still answers the scroll, because
        // that is the content, not the flourish.
        gsap.set(gateTop.current, { yPercent: -100 });
        gsap.set(gateBot.current, { yPercent: 100 });
        gsap.set(grainRef.current, { opacity: 0.28 });
      } else {
        // ── 0 → GATE: the leaves part ──
        // yPercent is relative to each leaf's own height (50vh), so -100/+100
        // takes each exactly clear of the viewport — no magic numbers to
        // re-derive when a phone's address bar collapses.
        tl.to(gateTop.current, { yPercent: -100, ease: "power2.inOut", duration: GATE }, 0)
          .to(gateBot.current, { yPercent: 100, ease: "power2.inOut", duration: GATE }, 0)
          // …and the letters lag behind their own leaf, which is what sells depth.
          .to(markTop.current, { yPercent: 34, ease: "power2.inOut", duration: GATE }, 0)
          .to(markBot.current, { yPercent: -34, ease: "power2.inOut", duration: GATE }, 0)
          // The seam lights the gap the instant there is a gap to light, and
          // then simply rides away with the leaf that casts it.
          .fromTo(".gate-bleed", { opacity: 0 }, { opacity: 1, ease: "power2.out", duration: GATE * 0.3 }, 0)
          // The grain belongs to the film, not to the black — bring it in with it.
          .fromTo(grainRef.current, { opacity: 0 }, { opacity: 0.28, ease: "none", duration: GATE }, 0);
      }

      // ── GATE → 1: the film, scrubbed ──
      tl.to(
        state,
        {
          t: () => (Number.isFinite(video.duration) ? video.duration : 0),
          ease: "none",
          duration: reduce ? 1 : 1 - GATE,
          onUpdate: applySeek,
        },
        reduce ? 0 : GATE
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
      {/* Only the matching poster is fetched. The `poster` attribute itself is
          set in the layout effect above — hard-coding one here would make every
          phone download the 1600px desktop still it can never show. */}
      <link rel="preload" as="image" href="/images/hero-poster.avif" type="image/avif" media="(min-width: 768px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/images/hero-poster-mobile.avif" type="image/avif" media="(max-width: 767px)" fetchPriority="high" />

      {/* The name, for anything that reads rather than looks. The visible halves
          live inside the leaves and are split across two elements. */}
      <h1 className="sr-only">Anima Residences</h1>

      {/* The film — loaded but not playing; scrubbed by scroll once the gate is
          open. It is behind the leaves from the first paint, so there is nothing
          to load, decode or lay out at the moment the gate parts. */}
      <div className="absolute inset-0" style={{ ...LQIP_BG, backgroundColor: "#181913" }}>
        <div className="hero-letterbox absolute inset-0" />
        <video
          ref={videoRef}
          autoPlay={false}
          muted
          playsInline
          controls={false}
          // auto, not metadata. A scrub takes the visitor past EVERY frame, so
          // the whole file comes down regardless — the only question is whether
          // it arrives up front, or in 244 range requests racing the scroll.
          preload="auto"
          className="hero-video cine-breath"
          style={{ willChange: "transform" }}
        >
          {SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} media={s.media} />
          ))}
        </video>
      </div>

      {/* Cinematic grade on the footage. */}
      <div className="cine-vignette" aria-hidden />
      <div ref={grainRef} className="cine-grain" style={{ opacity: 0 }} aria-hidden />

      {/* Top scrim — the navigation reads against the footage once it shows. */}
      <div
        className="absolute inset-0 z-[7]"
        style={{ pointerEvents: "none", background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 22%)" }}
      />

      {/* ── The gate. Each leaf carries its half of the name, its half of the
             gold seam, and the light that seam throws into the opening. ── */}
      <div ref={gateTop} className="gate gate--top" aria-hidden>
        <div ref={markTop} className="gate-mark gate-mark--top" style={{ opacity: 0 }}>
          <span className="gate-word cine-word">ANIMA</span>
        </div>
        <span className="gate-edge" />
        <span className="gate-bleed" />
      </div>

      <div ref={gateBot} className="gate gate--bot" aria-hidden>
        <span className="gate-edge" />
        <span className="gate-bleed" />
        <div ref={markBot} className="gate-mark gate-mark--bot" style={{ opacity: 0 }}>
          <span className="gate-word gate-word--sub">RESIDENCES</span>
        </div>
      </div>
    </section>
  );
}
