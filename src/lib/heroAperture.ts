/**
 * The hero's opening light — Apollo's radiance breaking through the parting
 * plaster: a golden sun blooming at the threshold. Kept out of the React
 * component so its (deliberately impure, shimmering) motion lives in a plain
 * module. It sits BEHIND the plaster halves, so it is only seen through the
 * widening gap — the light of the gods pouring out as the gates of Olympus open.
 *
 * Drive it from scroll with setIntensity (0 = dark, 1 = full radiance):
 *   · a luminous core at the seam,
 *   · a sunburst of long/short rays (a classical golden sun),
 *   · fine gold dust (ambrosia) drifting outward and twinkling.
 * All drawn additively, so it reads as real light rather than paint.
 */

export type Aperture = {
  setIntensity: (v: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
};

const RAYS = 52;
const DUST = 90;
const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

export function createAperture(canvas: HTMLCanvasElement): Aperture {
  const ctx = canvas.getContext("2d");
  let intensity = 0;
  let raf = 0;
  let dpr = 1;
  const t0 = now();

  // Gold dust, seeded once in polar coords about the centre.
  const dust = Array.from({ length: DUST }, () => ({
    ang: Math.random() * Math.PI * 2,
    r: Math.random(),
    sp: 0.015 + Math.random() * 0.05,
    ph: Math.random() * Math.PI * 2,
    sz: 0.5 + Math.random() * 1.7,
  }));

  const draw = () => {
    if (!ctx) {
      raf = 0;
      return;
    }
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const d = dpr;
    ctx.clearRect(0, 0, W, H);

    if (intensity > 0.002) {
      const t = (now() - t0) / 1000;
      const it = Math.min(1, intensity);
      const maxR = Math.hypot(W, H) * 0.62;

      ctx.globalCompositeOperation = "lighter";

      // luminous core at the threshold
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.55 * (0.55 + 0.45 * it));
      core.addColorStop(0, `rgba(255,249,228,${0.85 * it})`);
      core.addColorStop(0.14, `rgba(247,223,158,${0.5 * it})`);
      core.addColorStop(0.45, `rgba(214,184,124,${0.13 * it})`);
      core.addColorStop(1, "rgba(214,184,124,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);

      // sunburst rays — long and short, a classical golden sun
      const rot = t * 0.05;
      ctx.lineCap = "round";
      for (let i = 0; i < RAYS; i++) {
        const ang = (i / RAYS) * Math.PI * 2 + rot;
        const long = i % 2 === 0;
        const shimmer = 0.72 + 0.28 * Math.sin(t * 1.8 + i * 0.7);
        const len = maxR * (long ? 1 : 0.6) * it * shimmer;
        const x2 = cx + Math.cos(ang) * len;
        const y2 = cy + Math.sin(ang) * len;
        const ra = it * (long ? 0.42 : 0.26) * shimmer;
        const g = ctx.createLinearGradient(cx, cy, x2, y2);
        g.addColorStop(0, `rgba(250,232,182,${ra})`);
        g.addColorStop(0.5, `rgba(214,184,124,${ra * 0.4})`);
        g.addColorStop(1, "rgba(214,184,124,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = (long ? 2.4 : 1.3) * d;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // gold dust — ambrosia catching the light
      for (const p of dust) {
        const r = ((p.r + t * p.sp) % 1) * maxR * 0.92;
        const x = cx + Math.cos(p.ang) * r;
        const y = cy + Math.sin(p.ang) * r * 0.86;
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.1 + p.ph));
        const fade = 1 - r / (maxR * 0.92);
        ctx.globalAlpha = it * twinkle * fade;
        ctx.fillStyle = "rgba(252,238,200,1)";
        ctx.beginPath();
        ctx.arc(x, y, p.sz * d, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    raf = requestAnimationFrame(draw);
  };

  const resize = () => {
    dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };

  resize();

  return {
    setIntensity: (v: number) => {
      intensity = v;
    },
    resize,
    start: () => {
      if (!raf) raf = requestAnimationFrame(draw);
    },
    stop: () => {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
