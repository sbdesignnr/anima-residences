"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * The living cream ground the site opens on.
 *
 * The reference is a still: soft plaster, paper-cut lobes, gold edge lines. The
 * brief is that same look but ALIVE, and dissolving on scroll as the camera
 * dives through it. A static image cannot do that, so it is rendered — a single
 * WebGL2 quad running a domain-warped noise field:
 *
 *   · the field is thresholded into a few broad bands → the big soft lobes
 *   · a gold contour is drawn where two bands meet → the edge lines, and a glint
 *     travels along them so they are never dead
 *   · screen-space derivatives of the field give a free relief normal → the
 *     paper-cut light and shadow
 *   · the whole field flows on a slow time, so it breathes rather than sits
 *
 * On scroll the DIVE uniform zooms the field and bleaches it toward light, so it
 * melts into brightness while the element is also flown back and faded in CSS —
 * two readings of the same gesture, which is what gives it depth.
 *
 * Hand-rolled WebGL2, not a library: this is one quad and ~40 lines of GLSL.
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 frag;

uniform vec2 uRes;
uniform float uTime;
uniform float uDive;    // 0 at rest .. 1 fully dived through
uniform float uReduce;  // 1 = the visitor asked for less motion
uniform float uGlow;    // 0 at rest .. 1 as the opening quickens the gold shimmer

const vec3 C_LO    = vec3(0.826, 0.734, 0.586);  // beige in shade
const vec3 C_MID   = vec3(0.910, 0.848, 0.728);  // sand
const vec3 C_HI    = vec3(0.965, 0.938, 0.882);  // light cream
const vec3 GOLD    = vec3(0.792, 0.635, 0.396);
const vec3 GOLD_HI = vec3(0.976, 0.914, 0.796);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 11.3; a *= 0.5; }
  return v;
}

// A domain-warped low-frequency field: big soft lobes that drift with t.
float field(vec2 uv, float t) {
  vec2 p = uv * 1.4;
  vec2 w = vec2(fbm(p + vec2(0.0, t * 0.6)), fbm(p + vec2(4.7, -t * 0.6)));
  return fbm(p + 1.15 * w + 0.12 * t);
}

void main() {
  float t = uReduce > 0.5 ? 4.0 : uTime * 0.05;
  float ar = uRes.x / max(uRes.y, 1.0);

  // Camera diving in: magnify the field about the centre.
  float zoom = 1.0 + uDive * 0.55;
  vec2 uv = (vUv - 0.5) * vec2(ar, 1.0) / zoom + 0.5;

  // Lift the centre so the plaster is brightest where the wordmark sits, and the
  // lobes darken toward the corners — the light-middle balance of the reference.
  float dc = length((vUv - 0.5) * vec2(ar, 1.0));
  float h = field(uv, t) + 0.14 * smoothstep(0.72, 0.0, dc);

  // Relief from the field's own screen-space slope — free, and real. Gentle, so
  // it reads as soft plaster rather than creased foil.
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 n = normalize(vec3(-dhx * 185.0, -dhy * 185.0, 1.0));
  float diff = clamp(dot(n, normalize(vec3(-0.4, -0.5, 0.7))), 0.0, 1.0);

  // Colour by how "high" the plaster is here.
  float lev = clamp(h, 0.0, 1.0);
  vec3 base = mix(C_LO, C_MID, smoothstep(0.26, 0.56, lev));
  base = mix(base, C_HI, smoothstep(0.56, 0.94, lev));
  base *= 0.90 + 0.17 * diff;

  // Gold contour where two bands meet, with a glint travelling along it. As the
  // opening quickens (uGlow), the glint runs faster, the veins brighten and
  // bloom, and a soft shimmer breathes through the whole plaster.
  float N = 2.4;
  float band = fract(h * N);
  float edge = min(band, 1.0 - band);
  float aa = fwidth(h * N) * 1.1 + 0.006;
  float line = 1.0 - smoothstep(0.0, aa, edge);
  float glint = 0.55 + 0.45 * sin(h * 22.0 - uTime * (1.0 + uGlow * 3.0) + uv.x * 5.0);
  vec3 goldc = mix(GOLD, GOLD_HI, clamp(glint + uGlow * 0.45, 0.0, 1.0));
  vec3 col = mix(base, goldc, line * (0.88 + uGlow * 0.1));
  col += goldc * line * (0.24 + uGlow * 0.85);
  // a gold shimmer that rises through the whole field, not just the veins
  col += goldc * uGlow * 0.07 * (0.5 + 0.5 * sin(uTime * 3.0 + h * 30.0));

  // A whisper darker at the very corners only.
  col *= 0.95 + 0.06 * smoothstep(1.05, 0.35, dc);

  // A gentle overall lift as it intensifies.
  col *= 1.0 + uGlow * 0.1;

  // The dive bleaches it into light as it melts away.
  col = mix(col, C_HI * 1.03, uDive * 0.55);

  // A breath of grain — plaster, not a gradient.
  col += (hash(vUv * uRes + uTime) - 0.5) * 0.012;

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

export type WaveHandle = {
  /** Drive the dive from scroll: 0 at rest, 1 fully dived through. */
  setDive: (v: number) => void;
  /** Intensify the gold shimmer as the plaster opens: 0 at rest, 1 at full. */
  setGlow: (v: number) => void;
};

const WaveCanvas = forwardRef<WaveHandle, { className?: string; startTime?: number }>(function WaveCanvas(
  { className, startTime },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const diveRef = useRef(0);
  const glowRef = useRef(0);
  const kickRef = useRef<() => void>(() => {});

  useImperativeHandle(ref, () => ({
    setDive: (v: number) => {
      diveRef.current = v;
      kickRef.current();
    },
    setGlow: (v: number) => {
      glowRef.current = v;
      kickRef.current();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) {
      // No WebGL2 — the CSS fallback (a cream gradient) shows through instead.
      canvas.dataset.gl = "off";
      return;
    }
    canvas.dataset.gl = "on";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) ?? "link failed");
    }
    gl.useProgram(prog);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      dive: gl.getUniformLocation(prog, "uDive"),
      reduce: gl.getUniformLocation(prog, "uReduce"),
      glow: gl.getUniformLocation(prog, "uGlow"),
    };
    gl.uniform1f(U.reduce, reduce ? 1 : 0);

    // Paint cream immediately — a GL canvas is born black, and a black flash on a
    // page that opens on light is the worst first frame there is.
    gl.clearColor(0.933, 0.9, 0.83, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let w = 0, h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, reduce ? 1.5 : 2);
      const nw = Math.max(1, Math.round(r.width * dpr));
      const nh = Math.max(1, Math.round(r.height * dpr));
      if (nw !== w || nh !== h) {
        w = canvas.width = nw;
        h = canvas.height = nh;
        gl.viewport(0, 0, w, h);
      }
    };

    let visible = true;
    let running = false;
    let raf = 0;
    // A shared origin lets two canvases render the SAME field frame-for-frame, so
    // the split hero's two plaster halves meet seamlessly at the centre.
    const t0 = startTime ?? performance.now();

    const frame = () => {
      raf = 0;
      if (!visible) {
        running = false;
        return;
      }
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.time, (performance.now() - t0) / 1000);
      gl.uniform1f(U.dive, diveRef.current);
      gl.uniform1f(U.glow, glowRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Reduced motion is a still: draw one frame, then rest until scroll moves
      // the dive. Otherwise keep flowing.
      if (reduce) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
      running = true;
    };
    const kick = () => {
      if (!running && visible && !raf) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) kick();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      kick();
    });
    ro.observe(canvas);
    resize();
    kick();

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [startTime]);

  return <canvas ref={canvasRef} className={className} />;
});

export default WaveCanvas;
