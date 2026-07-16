/**
 * The hero's gold lightning — a canvas engine, kept out of the React component
 * so its (deliberately impure, flickering) randomness lives in a plain module.
 *
 * `createBolt(canvas)` returns a handle; drive it from scroll with setIntensity
 * (0 = dark, 1 = full strike). While intensity > 0 it redraws a fresh fractal
 * bolt every few frames — a jagged brass core, a wide glow and a soft flash bar
 * — so the seam reads as a live electric arc rather than a static graphic.
 */

export type Bolt = {
  setIntensity: (v: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
};

export function createBolt(canvas: HTMLCanvasElement): Bolt {
  const ctx = canvas.getContext("2d");
  let intensity = 0;
  let raf = 0;
  let dpr = 1;
  let path: number[][] = [];
  let forks: number[][][] = [];
  let lastGen = 0;

  /** A fractal bolt: displace each segment's midpoint, amplitude halving. */
  const gen = (W: number, H: number) => {
    let pts: number[][] = [
      [0, H / 2 + (Math.random() - 0.5) * H * 0.2],
      [W, H / 2 + (Math.random() - 0.5) * H * 0.2],
    ];
    let amp = H * 0.34;
    for (let iter = 0; iter < 6; iter++) {
      const next: number[][] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        next.push(a);
        const my = (a[1] + b[1]) / 2 + (Math.random() - 0.5) * amp;
        next.push([(a[0] + b[0]) / 2, Math.max(4, Math.min(H - 4, my))]);
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      amp *= 0.52;
    }
    const f: number[][][] = [];
    for (let k = 0; k < 2; k++) {
      const idx = Math.min(pts.length - 1, Math.floor((0.3 + 0.4 * k + Math.random() * 0.1) * pts.length));
      const s = pts[idx];
      const branch: number[][] = [s];
      let x = s[0];
      let y = s[1];
      for (let j = 0; j < 4; j++) {
        x += (Math.random() * 0.6 + 0.2) * W * 0.06;
        y += (Math.random() - 0.5) * H * 0.5;
        branch.push([x, Math.max(2, Math.min(H - 2, y))]);
      }
      f.push(branch);
    }
    forks = f;
    path = pts;
  };

  const stroke = (pts: number[][]) => {
    if (!ctx || pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  const draw = () => {
    if (!ctx) {
      raf = 0;
      return;
    }
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (intensity > 0.002) {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      if (now - lastGen > 46 || path.length === 0) {
        gen(W, H);
        lastGen = now;
      }
      const a = Math.min(1, intensity) * (0.62 + 0.38 * Math.random());

      const band = ctx.createLinearGradient(0, H / 2 - H * 0.46, 0, H / 2 + H * 0.46);
      band.addColorStop(0, "rgba(214,184,124,0)");
      band.addColorStop(0.5, `rgba(236,204,150,${a * 0.5})`);
      band.addColorStop(1, "rgba(214,184,124,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, W, H);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // wide gold glow
      ctx.shadowColor = "rgba(220,188,128,1)";
      ctx.shadowBlur = 46 * dpr * Math.min(1, intensity);
      ctx.strokeStyle = `rgba(214,176,116,${a * 0.95})`;
      ctx.lineWidth = 5 * dpr;
      stroke(path);
      forks.forEach(stroke);

      // brass body
      ctx.shadowBlur = 16 * dpr * Math.min(1, intensity);
      ctx.strokeStyle = `rgba(248,234,204,${a})`;
      ctx.lineWidth = 2.6 * dpr;
      stroke(path);
      forks.forEach(stroke);

      // white-hot core, with a touch of its own glow
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = 6 * dpr * Math.min(1, intensity);
      ctx.strokeStyle = `rgba(255,254,250,${Math.min(1, a * 1.1)})`;
      ctx.lineWidth = 1.4 * dpr;
      stroke(path);
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
