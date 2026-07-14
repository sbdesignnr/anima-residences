#!/usr/bin/env node
/**
 * Anima Residences — media pipeline.
 *
 * Run: `npm run media` (also runs automatically before `dev` and `build`).
 *
 * Sources of truth live in `assets/` and are never shipped. Everything under
 * `public/` is generated, so dropping a new photo into `assets/images/` is all
 * you ever have to do.
 *
 * Images  → AVIF + WebP + a compressed fallback, capped at MAX_W, plus a
 *           base64 LQIP written to `src/lib/lqip.json` for instant paint.
 * Video   → scroll-scrub encodes.
 *
 * Why the video settings look odd:
 *   The hero is *scrubbed* by scroll, not played. Every scroll frame seeks to a
 *   new timestamp, and a seek costs "decode everything since the last
 *   keyframe". The original had a keyframe every ~27 frames, so each seek
 *   decoded up to 27 frames of 1080p@20Mbit — that is the stutter.
 *   `keyint=1` makes every frame a keyframe: a seek decodes exactly one.
 *   `-tune fastdecode` is deliberately NOT used; it disables CABAC and inflates
 *   the file ~15% for a decode saving that is irrelevant at one frame.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";

const ROOT = process.cwd();
const SRC_IMG = path.join(ROOT, "assets/images");
const SRC_VID = path.join(ROOT, "assets/videos");
const OUT_IMG = path.join(ROOT, "public/images");
const SRC_SKETCH = path.join(ROOT, "assets/images/sketches");
const OUT_SKETCH = path.join(ROOT, "public/images/sketches");
const OUT_VID = path.join(ROOT, "public/videos");
// Committed, so CI does not re-encode a 45 MB master on every build.
const CACHE = path.join(ROOT, "assets/.media-cache.json");
const LQIP_OUT = path.join(ROOT, "src/lib/lqip.json");
const GALLERY_OUT = path.join(ROOT, "src/lib/gallery.json");
const MEDIA_OUT = path.join(ROOT, "src/lib/media.json");

const MAX_W = 2000; // nothing on this site is displayed wider than this
// Per-asset caps. The logo renders at 38–48 px tall; shipping 1348 px of it is
// ~60 KB of pixels nobody will ever see.
const MAX_W_BY_BASE = { logo_simon: 440 };
const QUALITY = { avif: 62, webp: 78, jpeg: 82, png: 90 };

/* ── video recipes, all chosen by measurement (SSIM vs. the master) ──
 *
 * THE OLD NOTE HERE WAS WRONG, and it is what made the hero stutter. It said:
 *
 *   "Size is not a download cost: every frame is a keyframe … so preload=metadata
 *    lets the browser range-request only the frames the visitor actually scrolls
 *    past."
 *
 * A scrub takes the visitor past EVERY frame. That is what a scrub is. So all
 * 36 MB came down anyway — in 244 separate range requests, racing the scroll and
 * losing. Size is the whole cost, and the encode had to shrink.
 *
 * Measured, at the size the video is actually shown (1440px), against the master:
 *
 *   1928px crf26   30 MB   SSIM 0.974    <- what shipped, and what stuttered
 *   1440px crf26   19 MB   SSIM 0.957
 *   1440px crf30   12 MB   SSIM 0.927    <- indistinguishable under the grade
 *   1152px crf28   11 MB   SSIM 0.925
 *
 * The hero carries a vignette, a film grain and a gate over it, and it is a
 * construction timelapse — high motion, low detail-persistence. It does not need
 * 1928px, and past 1440 the extra pixels are being thrown away by the display.
 *
 * Short GOPs were tried too and are NOT the answer here: at keyint 16 the file
 * only fell 43 MB → 32 MB, because a timelapse's successive frames share almost
 * nothing. Every frame stays a keyframe, so a seek still decodes exactly one.
 */
const MOBILE_CROP = "crop=840:1080:540:0"; // only if no portrait master (see below)

const VIDEO_JOBS = [
  { out: "hero-desktop.mp4",      vf: "scale=1440:-2,fps=12", codec: "h264", crf: 30 },
  { out: "hero-desktop.hevc.mp4", vf: "scale=1440:-2,fps=12", codec: "hevc", crf: 33 },
  { out: "hero-mobile.mp4",       vf: `${MOBILE_CROP},scale=720:-2,fps=12`, codec: "h264", crf: 30 },
  { out: "hero-mobile.hevc.mp4",  vf: `${MOBILE_CROP},scale=720:-2,fps=12`, codec: "hevc", crf: 33 },
];

/** Every frame a keyframe -> a scroll seek decodes exactly one frame. */
const codecArgs = (codec, crf) =>
  codec === "hevc"
    ? [
        "-c:v", "libx265",
        "-crf", String(crf),
        "-preset", "medium",
        "-x265-params", "keyint=1:min-keyint=1:scenecut=0:log-level=none",
        "-tag:v", "hvc1", // Safari refuses hev1 in MP4
      ]
    : [
        "-c:v", "libx264",
        "-crf", String(crf),
        "-preset", "slow",
        "-x264-params", "keyint=1:min-keyint=1:scenecut=0",
        "-profile:v", "high",
      ];

const log = (...a) => console.log("  ", ...a);
const mb = (p) => (fs.statSync(p).size / 1048576).toFixed(2) + " MB";
const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";

const hashOf = (file) =>
  createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 16);

const loadCache = () => {
  try {
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  } catch {
    return {};
  }
};
const saveCache = (c) => {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(c, null, 2));
};

async function images(cache) {
  if (!fs.existsSync(SRC_IMG)) return {};
  fs.mkdirSync(OUT_IMG, { recursive: true });

  const lqip = {};
  const files = fs
    .readdirSync(SRC_IMG)
    .filter((f) => /\.(png|jpe?g|webp|tiff?)$/i.test(f)); // top level only; apartments/ is handled separately

  for (const file of files) {
    const src = path.join(SRC_IMG, file);
    const base = file.replace(/\.[^.]+$/, "");
    const hash = hashOf(src);
    const key = `img:${file}`;

    const meta = await sharp(src).metadata();
    const width = Math.min(meta.width ?? MAX_W, MAX_W_BY_BASE[base] ?? MAX_W);

    // Every image gets a 20px blurred preview, inlined into the HTML so the
    // page is never blank while the real file arrives.
    const preview = await sharp(src).resize(20).webp({ quality: 40 }).toBuffer();
    lqip[base] = {
      lqip: `data:image/webp;base64,${preview.toString("base64")}`,
      width: meta.width,
      height: meta.height,
    };

    if (cache[key] === hash) {
      log(`· ${file} (unchanged)`);
      continue;
    }

    const pipe = () => sharp(src).resize({ width, withoutEnlargement: true });
    await pipe().avif({ quality: QUALITY.avif, effort: 5 }).toFile(path.join(OUT_IMG, `${base}.avif`));
    await pipe().webp({ quality: QUALITY.webp }).toFile(path.join(OUT_IMG, `${base}.webp`));

    // A same-format fallback keeps existing <img src="…png"> references alive.
    const ext = path.extname(file).toLowerCase();
    if (ext === ".png") {
      await pipe().png({ quality: QUALITY.png, compressionLevel: 9, palette: true }).toFile(path.join(OUT_IMG, `${base}.png`));
    } else {
      await pipe().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(OUT_IMG, `${base}.jpg`));
    }

    const avif = path.join(OUT_IMG, `${base}.avif`);
    log(`✓ ${file}  ${mb(src)} → avif ${kb(avif)}`);
    cache[key] = hash;
  }

  fs.mkdirSync(path.dirname(LQIP_OUT), { recursive: true });
  fs.writeFileSync(LQIP_OUT, JSON.stringify(lqip, null, 2));
  return lqip;
}

/**
 * The hand sketches.
 *
 * They arrive as 2048² PNGs of 6–8 MB apiece — 44 MB for six, which is not a web
 * page, it is a download. They are shown at ~700 px on the biggest screen and
 * they are pencil on paper, which AVIF eats for breakfast.
 *
 * WebGL cannot take a <picture>: it needs ONE decoded bitmap. So both an AVIF and
 * a WebP are written and the client picks — see sketches.json.
 */
async function sketches(cache) {
  if (!fs.existsSync(SRC_SKETCH)) return;
  fs.mkdirSync(OUT_SKETCH, { recursive: true });
  const files = fs.readdirSync(SRC_SKETCH).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();

  for (const file of files) {
    const src = path.join(SRC_SKETCH, file);
    const base = file.replace(/\.[^.]+$/, "");
    const hash = hashOf(src);
    const key = `sketch:${file}`;
    const avif = path.join(OUT_SKETCH, `${base}.avif`);
    if (cache[key] === hash && fs.existsSync(avif)) {
      log(`= ${file} (cached)`);
      continue;
    }
    const pipe = () => sharp(src).resize({ width: 1440, withoutEnlargement: true });
    await pipe().avif({ quality: 58, effort: 6 }).toFile(avif);
    await pipe().webp({ quality: 80 }).toFile(path.join(OUT_SKETCH, `${base}.webp`));
    log(`✓ ${file}  ${mb(src)} → avif ${kb(avif)}`);
    cache[key] = hash;
  }
}

const probeSize = (file) => {
  const out = execFileSync(ffprobe.path, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height", "-of", "json", file,
  ]);
  const s = JSON.parse(out.toString()).streams[0];
  return { w: s.width, h: s.height };
};

/**
 * Some "portrait" exports are actually a vertical frame pillar-boxed inside a
 * 16:9 container (black bars left & right). Find the real content and return an
 * ffmpeg crop, or null if the frame is already edge-to-edge. Deterministic
 * (fixed seek + a plain luminance scan), so it doesn't break the encode cache.
 */
async function detectPillarbox(file) {
  const raw = path.join(os.tmpdir(), "anima-pillarbox.png");
  execFileSync(ffmpeg, ["-y", "-v", "error", "-ss", "8", "-i", file, "-frames:v", "1", raw]);
  const { data, info } = await sharp(raw).raw().toBuffer({ resolveWithObject: true });
  fs.rmSync(raw, { force: true });
  const { width: W, height: H, channels: C } = info;
  const colLum = (x) => {
    let s = 0, n = 0;
    for (let y = 0; y < H; y += 6) { const i = (y * W + x) * C; s += data[i] + data[i + 1] + data[i + 2]; n++; }
    return s / n / 3;
  };
  let L = 0; while (L < W && colLum(L) < 16) L++;
  let R = W - 1; while (R > 0 && colLum(R) < 16) R--;
  if (L <= 4 && R >= W - 5) return null; // no bars
  const w = (R - L + 1) & ~1;
  const x = L % 2 ? L + 1 : L;
  return { x, w, h: H & ~1, W };
}

function videos(cache, portrait) {
  const master = path.join(SRC_VID, "hero.mp4");
  if (!fs.existsSync(master)) {
    log("! assets/videos/hero.mp4 missing — skipping video");
    return;
  }
  fs.mkdirSync(OUT_VID, { recursive: true });
  const hash = hashOf(master);

  const jobSource = (job) => {
    const isMobile = job.out.includes("mobile");
    if (isMobile && portrait) {
      return { src: portrait.src, vf: portrait.vf, tag: portrait.tag };
    }
    return { src: master, vf: job.vf, tag: hash };
  };

  for (const job of VIDEO_JOBS) {
    const out = path.join(OUT_VID, job.out);
    const key = `vid:${job.out}`;
    const { src, vf, tag } = jobSource(job);
    // The cache must key on the RECIPE (and source) as well, or editing a crop
    // or swapping in the portrait master is silently ignored after one encode.
    const want = createHash("sha1").update(tag + JSON.stringify(job) + vf).digest("hex").slice(0, 16);
    if (cache[key] === want && fs.existsSync(out)) {
      log(`· ${job.out} (unchanged)`);
      continue;
    }
    execFileSync(
      ffmpeg,
      [
        "-y", "-v", "error",
        "-i", src,
        "-an",                                   // muted anyway; drop the track
        "-vf", vf,
        ...codecArgs(job.codec, job.crf),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",               // moov atom first: instant start
        out,
      ],
      { stdio: "inherit" }
    );
    log(`✓ ${job.out}  ${mb(src)} → ${mb(out)}`);
    cache[key] = want;
  }

  // The Hero reads the phone cut's real dimensions to choose its layout:
  // portrait (h > w) → full-height cover; landscape crop → letterboxed on blur.
  const m = probeSize(path.join(OUT_VID, "hero-mobile.mp4"));
  // "Tall enough to fill a phone" ≈ aspect ≤ 0.62 (a 16:9 portrait is 0.5625).
  // The 840×1080 landscape crop is 0.78 — tall-ISH, but still letterboxed.
  const fill = m.w / m.h <= 0.62;
  fs.mkdirSync(path.dirname(MEDIA_OUT), { recursive: true });
  fs.writeFileSync(MEDIA_OUT, JSON.stringify({ heroMobile: m }, null, 2));
  log(`· media.json  phone cut ${m.w}×${m.h} (${fill ? "portrait → full height" : "landscape → letterboxed"})`);

  /* Each poster is the first frame of the encode it belongs to — same crop,
     same colours, so the poster never jumps when the video takes over. */
  return [
    { base: "hero-poster", from: "hero-desktop.mp4", width: 1600 },
    { base: "hero-poster-mobile", from: "hero-mobile.mp4", width: 560 },
  ].map((p) => {
    // Key on the ENCODED file itself: whatever changed the video (a re-crop, or
    // swapping in the portrait master) changes its bytes, so the poster follows.
    const want = createHash("sha1").update(hashOf(path.join(OUT_VID, p.from)) + p.width).digest("hex").slice(0, 16);
    const avif = path.join(OUT_IMG, `${p.base}.avif`);
    if (cache[`poster:${p.base}`] === want && fs.existsSync(avif)) {
      log(`· ${p.base} (unchanged)`);
      // Still hand back a source: the LQIP must be re-emitted on every run or a
      // cached build drops it from lqip.json and the hero paints black.
      return { ...p, raw: path.join(OUT_IMG, `${p.base}.jpg`), regenerate: false };
    }
    const raw = path.join(os.tmpdir(), `anima-${p.base}.png`);
    execFileSync(ffmpeg, ["-y", "-v", "error", "-i", path.join(OUT_VID, p.from), "-frames:v", "1", raw], { stdio: "inherit" });
    cache[`poster:${p.base}`] = want;
    return { ...p, raw, regenerate: true };
  });
}

async function posters(jobs, lqip) {
  for (const job of jobs ?? []) {
    if (!fs.existsSync(job.raw)) continue;

    if (job.regenerate) {
      const pp = () => sharp(job.raw).resize({ width: job.width, withoutEnlargement: true });
      await pp().avif({ quality: 52 }).toFile(path.join(OUT_IMG, `${job.base}.avif`));
      await pp().webp({ quality: 70 }).toFile(path.join(OUT_IMG, `${job.base}.webp`));
      await pp().jpeg({ quality: 76, mozjpeg: true }).toFile(path.join(OUT_IMG, `${job.base}.jpg`));
    }

    const preview = await sharp(job.raw).resize(24).webp({ quality: 40 }).toBuffer();
    lqip[job.base] = { lqip: `data:image/webp;base64,${preview.toString("base64")}` };

    if (job.regenerate) fs.rmSync(job.raw, { force: true });
    log(`✓ ${job.base}  avif ${kb(path.join(OUT_IMG, `${job.base}.avif`))}`);
  }

  fs.writeFileSync(LQIP_OUT, JSON.stringify(lqip, null, 2));
  return lqip;
}

/**
 * Hero blur-fill (phones only).
 *
 * The master is 1920×1080 landscape; a phone is portrait. Showing the WHOLE
 * building means letterboxing — the sharp video can only ever fill ~40% of a
 * tall screen without cropping the facade. Rather than leave the surround
 * black, we fill it with a heavily blurred, darkened still of the finished
 * building. The screen reads as full, the facade stays whole and sharp.
 *
 * Pre-blurred here (not via a CSS filter) so phones pay nothing at runtime.
 */
async function heroFill(cache) {
  const master = path.join(SRC_VID, "hero.mp4");
  if (!fs.existsSync(master)) return;
  const hash = hashOf(master);
  const want = createHash("sha1").update(hash + "fill-v1").digest("hex").slice(0, 16);
  const out = path.join(OUT_IMG, "hero-fill-mobile.jpg");
  if (cache["fill"] === want && fs.existsSync(out)) {
    log("· hero-fill (unchanged)");
    return;
  }
  // t=18.2s is the finished render — the aspirational frame, and a calm warm
  // wash behind every earlier phase of the timelapse.
  const raw = path.join(os.tmpdir(), "anima-fill.png");
  execFileSync(ffmpeg, ["-y", "-v", "error", "-ss", "18.2", "-i", master, "-frames:v", "1", raw], { stdio: "inherit" });
  await sharp(raw).resize({ width: 720 }).blur(22).modulate({ brightness: 0.82 }).jpeg({ quality: 58, mozjpeg: true }).toFile(out);
  fs.rmSync(raw, { force: true });
  cache["fill"] = want;
  log(`✓ hero-fill  ${kb(out)}`);
}

/**
 * Apartment galleries.
 *
 * Drop photos into `assets/images/apartments/<unit>/` — e.g. `3B/01.jpg` — and
 * they come out as AVIF + WebP + a JPEG fallback, each with an inline blur
 * placeholder, listed in `src/lib/gallery.json`. Nothing else to wire up.
 */
async function galleries(cache) {
  const root = path.join(SRC_IMG, "apartments");
  const out = {};
  if (!fs.existsSync(root)) {
    fs.mkdirSync(path.dirname(GALLERY_OUT), { recursive: true });
    fs.writeFileSync(GALLERY_OUT, JSON.stringify(out, null, 2));
    log("· no assets/images/apartments — galleries empty");
    return out;
  }

  for (const unit of fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory())) {
    const dir = path.join(root, unit);
    const outDir = path.join(OUT_IMG, "apartments", unit);
    fs.mkdirSync(outDir, { recursive: true });

    const shots = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|tiff?)$/i.test(f)).sort();
    out[unit] = [];

    for (const file of shots) {
      const src = path.join(dir, file);
      const base = file.replace(/\.[^.]+$/, "");
      const hash = hashOf(src);
      const key = `gal:${unit}/${file}`;
      const meta = await sharp(src).metadata();

      const preview = await sharp(src).resize(20).webp({ quality: 40 }).toBuffer();
      out[unit].push({
        src: `/images/apartments/${unit}/${base}.jpg`,
        avif: `/images/apartments/${unit}/${base}.avif`,
        webp: `/images/apartments/${unit}/${base}.webp`,
        lqip: `data:image/webp;base64,${preview.toString("base64")}`,
        width: meta.width,
        height: meta.height,
      });

      if (cache[key] === hash) continue;
      const pipe = () => sharp(src).resize({ width: Math.min(meta.width ?? 1800, 1800), withoutEnlargement: true });
      await pipe().avif({ quality: QUALITY.avif, effort: 5 }).toFile(path.join(outDir, `${base}.avif`));
      await pipe().webp({ quality: QUALITY.webp }).toFile(path.join(outDir, `${base}.webp`));
      await pipe().jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toFile(path.join(outDir, `${base}.jpg`));
      log(`✓ ${unit}/${file}  ${mb(src)} → avif ${kb(path.join(outDir, `${base}.avif`))}`);
      cache[key] = hash;
    }
    if (shots.length) log(`· ${unit}: ${shots.length} photo(s)`);
  }

  fs.mkdirSync(path.dirname(GALLERY_OUT), { recursive: true });
  fs.writeFileSync(GALLERY_OUT, JSON.stringify(out, null, 2));
  return out;
}

/*
 * NO MASTERS, NO RUN.
 *
 * assets/ holds ~150 MB of camera masters and it is deliberately NOT in git —
 * what git carries is the pipeline's OUTPUT (public/images, public/videos,
 * src/lib/*.json), which is all a build actually needs. On Vercel, therefore,
 * assets/ is simply not there.
 *
 * Running anyway was the dangerous part: images() answers {} when it finds no
 * source folder, and the script would then write that {} straight over the
 * committed lqip.json — after which the hero reads lqip["hero-poster"].lqip out
 * of an empty object and the build dies. A pipeline with nothing to do must do
 * nothing, not do it emptily.
 */
const ARTEFACTS = [LQIP_OUT, MEDIA_OUT, GALLERY_OUT];
if (!fs.existsSync(path.join(ROOT, "assets"))) {
  const missing = ARTEFACTS.filter((f) => !fs.existsSync(f));
  if (missing.length) {
    console.error(
      "\nanima · media pipeline\n" +
        "  ✗ assets/ is absent AND the generated media is not committed:\n" +
        missing.map((f) => `      ${path.relative(ROOT, f)}`).join("\n") +
        "\n  Run `npm run media` on a machine that has assets/, and commit what it writes.\n"
    );
    process.exit(1);
  }
  console.log("\nanima · media pipeline\n   · no assets/ — building from the committed media\n");
  process.exit(0);
}

const cache = loadCache();
console.log("\nanima · media pipeline");
console.log("images");
const lqip = await images(cache);
console.log("sketches");
await sketches(cache);
console.log("hero-fill");
await heroFill(cache);
console.log("galleries");
await galleries(cache);
console.log("video");
/*
 * Optional portrait master for the phone. The landscape hero can't fill a phone
 * screen and show the whole building at once (see MOBILE_CROP); a vertically-
 * shot export can. Drop it in as assets/videos/hero-portrait.mp4 — pillar-box
 * bars (a vertical frame inside a 16:9 container) are detected and cropped off,
 * and the layout flips to full height automatically (media.json).
 */
const PORTRAIT_SRC = path.join(SRC_VID, "hero-portrait.mp4");
let portrait = null;
if (fs.existsSync(PORTRAIT_SRC)) {
  const box = await detectPillarbox(PORTRAIT_SRC);
  // 720px wide. A phone shows this at ~390 CSS px; 1072 was three times the
  // pixels it can resolve and 25 MB down somebody's mobile data.
  const vf = box
    ? `crop=${box.w}:${box.h}:${box.x}:0,scale=720:-2,fps=12`
    : "scale=720:-2,fps=12";
  portrait = { src: PORTRAIT_SRC, vf, tag: hashOf(PORTRAIT_SRC) };
  console.log(`   · portrait master${box ? ` (pillar-box removed → ${box.w}×${box.h})` : ""}`);
}
const posterJobs = videos(cache, portrait);
await posters(posterJobs, lqip);
saveCache(cache);
console.log("done\n");
