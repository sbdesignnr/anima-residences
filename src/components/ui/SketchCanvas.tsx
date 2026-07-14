"use client";

import { useEffect, useRef } from "react";

/**
 * The sketch, drawn by a hand — and lit like a stone when you touch it.
 *
 * Two things happen on one WebGL2 surface, and they have to happen on the same
 * one, because the second reads the pixels the first produces.
 *
 * 1. THE HAND. The sheet is not faded in; it is *drawn*. The shader separates the
 *    graphite from the paper by luminance, so the aged sheet — its stains, its
 *    fibres — is there from the first frame and only the pencil arrives. It
 *    arrives the way a hand shades: row by row, alternating direction, each row
 *    bleeding into the next through a noise field, so no two runs land on the
 *    same line. A darker "pressure" band rides the front, which is the graphite
 *    laid down a moment ago and not yet settled.
 *
 * 2. THE STONE. On hover, a wave leaves the cursor. It refracts the sheet — and
 *    it refracts each channel by a different amount, which is what dispersion IS
 *    and is why the crests break into spectral colour rather than a white sheen.
 *    The crests also catch a sparkle field, gated so the graphite glitters and
 *    the paper does not.
 *
 * Hand-rolled against WebGL2 rather than pulled from three.js: this is ~90 lines
 * of GLSL and one quad, and three would be 600 KB to draw it.
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/**
 * PASS 1 — the bare sheet.
 *
 * Run ONCE per sketch, into an offscreen texture. It is seventeen taps a pixel
 * and it does not depend on the time, the cursor or the hand — recomputing it
 * sixty times a second while somebody waves a mouse about would be seventeen
 * taps of pure waste on every one of those frames.
 */
const PAPER_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;
uniform sampler2D uImg;

const vec3 PAPER = vec3(0.918, 0.868, 0.780);
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 texel(vec2 uv) {
  vec4 s = texture(uImg, uv);
  return mix(PAPER, s.rgb, s.a);
}

// Fading toward a flat cream in proportion to how dark a pixel is does NOT give
// bare paper: a light pencil line is only half-dark, so it only half-vanishes,
// and what is left before the hand arrives is a ghost of the finished drawing.
// Then nothing is being drawn — it is merely darkening.
//
// So the paper is reconstructed rather than guessed: a max filter over a ring
// wider than any stroke. Locally, the lightest thing IS the paper — which keeps
// its warmth, its gradient and its foxing, and takes the graphite off entirely.
void main() {
  const float R1 = 0.0075;
  const float R2 = 0.0145;
  vec3 best = texel(vUv);
  float bl = luma(best);
  for (int i = 0; i < 8; i++) {
    vec2 d = vec2(cos(float(i) * 0.7854), sin(float(i) * 0.7854));
    vec3 c1 = texel(vUv + d * R1); float l1 = luma(c1);
    if (l1 > bl) { bl = l1; best = c1; }
    vec3 c2 = texel(vUv + d * R2); float l2 = luma(c2);
    if (l2 > bl) { bl = l2; best = c2; }
  }
  frag = vec4(best, 1.0);
}`;

/** PASS 2 — the hand, and the stone. Five taps. */
const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 frag;

uniform sampler2D uImg;
uniform sampler2D uPaper;
uniform float uProg;    // 0..1 — how much of the drawing the hand has laid down
uniform float uTime;
uniform vec2  uMouse;   // uv
uniform float uHover;   // 0..1, eased
uniform float uReduce;  // 1 = the visitor asked for less motion

const vec3 PAPER = vec3(0.918, 0.868, 0.780);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return v;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 texel(vec2 uv) {
  vec4 s = texture(uImg, uv);
  return mix(PAPER, s.rgb, s.a);
}
// NOT smoothstep(0.86, 0.40, L) — a DESCENDING edge pair is undefined behaviour
// in GLSL, and the driver handed back garbage that turned the whole sheet black.
float inkAt(vec2 uv) {
  return 1.0 - smoothstep(0.40, 0.86, luma(texel(uv)));
}

void main() {
  vec2 uv = vUv;

  /* ── 1. the hand ─────────────────────────────────────────────────────────
     The order in which the pencil reaches a pixel. Rows are worked top to
     bottom and each is run in the opposite direction to the last, so the hand
     sweeps back and forth. The noise is what stops it being a machine. */
  float a = 0.30;
  mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
  vec2 p = R * (uv - 0.5) + 0.5;

  const float ROWS = 10.0;
  float row = floor(p.y * ROWS);
  float run = mod(row, 2.0) < 0.5 ? p.x : 1.0 - p.x;
  float wobble = fbm(uv * 3.4) * 0.10 + fbm(uv * 13.0) * 0.022;
  float order = clamp(row / ROWS * 0.76 + run * 0.24 + wobble, 0.0, 1.0);

  float prog = mix(uProg, 1.0, uReduce);
  float m = 1.0 - smoothstep(prog - 0.045, prog + 0.045, order);

  /* ── 2. the stone ────────────────────────────────────────────────────────
     A wave leaving the cursor. Each channel is bent by a different amount —
     that is dispersion, and it is the whole reason the crests come out
     spectral instead of merely bright. */
  float d = distance(uv, uMouse);
  vec2 dir = d > 1e-5 ? (uv - uMouse) / d : vec2(0.0);
  float env = exp(-d * 5.2) * uHover * (1.0 - uReduce);
  float wave = sin(d * 54.0 - uTime * 6.5);
  vec2 off = dir * wave * env * 0.0060;

  // The bare sheet is found once; the drawing on top of it is fetched three
  // times, one per channel, each bent by a different amount. (Reconstructing the
  // paper per channel too would be sixteen more taps to move a line by a pixel.)
  vec3 bare = texture(uPaper, uv).rgb;
  vec3 drawn = vec3(
    texel(uv + off * 1.35).r,
    texel(uv + off * 1.00).g,
    texel(uv + off * 0.62).b
  );
  vec3 col = mix(bare, drawn, m);

  float ink = inkAt(uv);

  // The pencil's pressure, at the point it has just this moment reached.
  float front = exp(-pow((order - prog) / 0.055, 2.0)) * (1.0 - uReduce);
  col -= front * ink * 0.16;
  col -= front * 0.020 * vnoise(uv * 420.0); // graphite dust, thrown ahead of it

  // The facets. Only the crests catch, and the graphite catches more than paper.
  float crest = smoothstep(0.55, 1.0, wave) * env;
  vec3 iris = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + wave * 0.42 + 0.12));
  col += iris * crest * (0.09 + 0.24 * ink) * m;

  float spark = pow(vnoise(uv * 340.0 + uTime * 0.8), 14.0) * crest * 9.0;
  col += vec3(1.0, 0.98, 0.92) * spark * (0.30 + 0.70 * ink) * m;

  // The caustic — the clean bright edge a facet throws, without the colour.
  col += vec3(1.0, 0.99, 0.95) * pow(crest, 2.4) * 0.16;

  // and a breath of light on the sheet right under the cursor
  col += vec3(1.0, 0.96, 0.88) * exp(-d * 13.0) * uHover * 0.055 * (1.0 - uReduce);

  frag = vec4(col, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? "shader failed");
  }
  return sh;
}

/** AVIF first; a browser that cannot decode it quietly takes the WebP. */
const load = (base: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fb = new Image();
      fb.crossOrigin = "anonymous";
      fb.onload = () => resolve(fb);
      fb.onerror = reject;
      fb.src = `${base}.webp`;
    };
    img.src = `${base}.avif`;
  });

export type SketchHandle = {
  /** Swap the sheet and draw it, from blank paper. */
  show: (index: number) => void;
};

export default function SketchCanvas({
  bases,
  index,
  onReady,
}: {
  /** Paths without an extension — both an .avif and a .webp exist for each. */
  bases: string[];
  index: number;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(index);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) {
      // No WebGL2: the plain sheet is shown instead (see the <picture> fallback).
      wrap.dataset.gl = "off";
      onReady?.();
      return;
    }
    wrap.dataset.gl = "on";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const link = (frag: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p) ?? "link failed");
      }
      return p;
    };
    const paperProg = link(PAPER_FRAG);
    const prog = link(FRAG);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    // Both programs declare aPos first, so one buffer feeds both.
    for (const p of [paperProg, prog]) {
      gl.useProgram(p);
      const loc = gl.getAttribLocation(p, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.useProgram(paperProg);
    gl.uniform1i(gl.getUniformLocation(paperProg, "uImg"), 0);

    gl.useProgram(prog);
    const U = {
      img: gl.getUniformLocation(prog, "uImg"),
      paper: gl.getUniformLocation(prog, "uPaper"),
      prog: gl.getUniformLocation(prog, "uProg"),
      time: gl.getUniformLocation(prog, "uTime"),
      mouse: gl.getUniformLocation(prog, "uMouse"),
      hover: gl.getUniformLocation(prog, "uHover"),
      reduce: gl.getUniformLocation(prog, "uReduce"),
    };
    gl.uniform1i(U.img, 0);
    gl.uniform1i(U.paper, 1);
    gl.uniform1f(U.reduce, reduce ? 1 : 0);

    // Paper, from the very first frame. A GL canvas is born black, and for the
    // second it takes to fetch and decode the sheet, that black was a hole
    // punched clean through the page.
    gl.clearColor(0.918, 0.868, 0.780, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    /* The offscreen sheet the bare paper is baked into, once per sketch. */
    const PAPER_SIZE = 1024;
    const paperTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, paperTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAPER_SIZE, PAPER_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, paperTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const textures: (WebGLTexture | null)[] = bases.map(() => null);
    let current = -1;

    /** Bake the bare sheet for whatever is on unit 0 right now. */
    const bakePaper = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, PAPER_SIZE, PAPER_SIZE);
      gl.useProgram(paperProg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const upload = (i: number, img: HTMLImageElement) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      textures[i] = tex;
    };

    /* ── state the loop reads ── */
    const S = {
      draw: reduce ? 1 : 0, // the hand's progress
      hover: 0,
      hoverTarget: 0,
      mouse: [0.5, 0.5] as [number, number],
      mouseTarget: [0.5, 0.5] as [number, number],
      t0: performance.now(),
      visible: false,
      running: false,
    };

    const bind = (i: number) => {
      const tex = textures[i];
      if (!tex) return false;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, paperTex);
      current = i;
      bakePaper(); // the bare sheet, once — not on every frame of every hover
      return true;
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      // DPR is capped at 2: the shader is fill-rate bound and a 3x phone surface
      // triples the cost of every one of those fbm octaves for nothing anyone
      // can see.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      if (!S.visible) {
        S.running = false;
        return;
      }
      // Ease toward the pointer, so the wave has weight and does not snap.
      S.mouse[0] += (S.mouseTarget[0] - S.mouse[0]) * 0.16;
      S.mouse[1] += (S.mouseTarget[1] - S.mouse[1]) * 0.16;
      S.hover += (S.hoverTarget - S.hover) * 0.09;

      gl.uniform1f(U.prog, S.draw);
      gl.uniform1f(U.time, (performance.now() - S.t0) / 1000);
      gl.uniform2f(U.mouse, S.mouse[0], S.mouse[1]);
      gl.uniform1f(U.hover, S.hover);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Sleep the moment there is nothing moving: no hover, no wave still
      // decaying, and the hand has finished. A section that keeps a GPU busy
      // while it just sits there is a section that flattens a laptop battery.
      const idle = S.hover < 0.002 && S.hoverTarget === 0 && (S.draw >= 1 || reduce);
      if (idle) {
        S.running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
      S.running = true;
    };

    const kick = () => {
      if (!S.running && S.visible && !raf) {
        S.running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    /* The hand. A plain rAF ramp — GSAP is not needed to move one float, and
       this way the draw and the render share a single frame. */
    let drawRaf = 0;
    const runHand = () => {
      if (reduce) {
        S.draw = 1;
        kick();
        return;
      }
      S.draw = 0;
      const t0 = performance.now();
      const DUR = 2400;
      const step = () => {
        const t = Math.min((performance.now() - t0) / DUR, 1);
        // easeInOutSine: the hand starts slow, finds its rhythm, and eases off
        S.draw = 0.5 - 0.5 * Math.cos(Math.PI * t);
        kick();
        drawRaf = t < 1 ? requestAnimationFrame(step) : 0;
      };
      cancelAnimationFrame(drawRaf);
      drawRaf = requestAnimationFrame(step);
    };

    const showIndex = (i: number) => {
      if (i === current) return;
      if (bind(i)) runHand();
    };

    /* ── the pointer ── */
    const at = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      S.mouseTarget = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    const onEnter = (e: PointerEvent) => {
      at(e);
      S.mouse = [...S.mouseTarget] as [number, number]; // the wave starts AT the cursor
      S.hoverTarget = 1;
      kick();
    };
    const onMove = (e: PointerEvent) => {
      at(e);
      kick();
    };
    const onLeave = () => {
      S.hoverTarget = 0;
      kick();
    };
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    // Touch: no hover to speak of, so a tap sets the stone alight where it lands.
    wrap.addEventListener("pointerdown", (e) => {
      onEnter(e);
      window.setTimeout(onLeave, 1400);
    });

    const io = new IntersectionObserver(
      ([e]) => {
        S.visible = e.isIntersecting;
        if (S.visible) kick();
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      resize();
      kick();
    });
    ro.observe(wrap);
    resize();

    /*
     * The six sheets — 1.1 MB in AVIF — but NOT on page load.
     *
     * They used to be fetched the moment the component mounted, which is while
     * the hero is still pulling down its video: a megabyte of contention against
     * the one thing the visitor is actually looking at. They are fetched when the
     * section comes within a screen of the viewport instead, which is early
     * enough that the first sheet is always ready and late enough that it never
     * competes with the hero.
     */
    let dead = false;
    let started = false;
    const fetchSheets = () => {
      if (started || dead) return;
      started = true;
      Promise.all(bases.map((b) => load(b)))
        .then((imgs) => {
          if (dead) return;
          imgs.forEach((img, i) => upload(i, img));
          bind(idxRef.current);
          runHand();
          onReady?.();
        })
        .catch(() => {
          wrap.dataset.gl = "off";
          onReady?.();
        });
    };
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          fetchSheets();
          near.disconnect();
        }
      },
      { rootMargin: "100% 0px" }
    );
    near.observe(wrap);

    // Expose the switch to the React layer without re-creating the context.
    (wrap as HTMLDivElement & { __show?: (i: number) => void }).__show = showIndex;

    return () => {
      dead = true;
      near.disconnect();
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(drawRaf);
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      textures.forEach((t) => t && gl.deleteTexture(t));
      gl.deleteTexture(paperTex);
      gl.deleteFramebuffer(fbo);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // The context is built once. `index` is delivered through the imperative
    // handle below, because rebuilding a GL context per slide is madness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bases]);

  useEffect(() => {
    idxRef.current = index;
    const wrap = wrapRef.current as (HTMLDivElement & { __show?: (i: number) => void }) | null;
    wrap?.__show?.(index);
  }, [index]);

  return (
    <div ref={wrapRef} className="sk-wrap">
      <canvas ref={canvasRef} className="sk-canvas" />
      {/* Anything without WebGL2 — and anyone who asked for less motion — simply
          gets the sheet. `data-gl` decides which of the two is on screen. */}
      <picture className="sk-fallback">
        <source srcSet={`${bases[index]}.avif`} type="image/avif" />
        <img src={`${bases[index]}.webp`} alt="" />
      </picture>
    </div>
  );
}
