import { launch, sleep } from "./cdp.mjs";
import fs from "node:fs";
const OUT = "/private/tmp/claude-501/-Users-samuelbiben-Projects-anima-residences/a9df38b6-3ebb-465b-953d-ea38261c6cfc/scratchpad";
const b = await launch({ w: 1500, h: 1000, touch: false, profile: "sk4" });
await b.send("Emulation.setFocusEmulationEnabled", { enabled: true });
await b.send("Page.setWebLifecycleState", { state: "active" });
await b.goto("http://localhost:3000/");
await b.evalJs(`document.querySelector("#amenities").scrollIntoView({block:"center"}); true`);
await sleep(4000);   // let the page settle and the first sheet finish

const rect = async () => JSON.parse(await b.evalJs(`
  (() => { const q = document.querySelector('.sk-wrap').getBoundingClientRect();
    return JSON.stringify({ x: Math.round(q.left), y: Math.round(q.top),
      width: Math.round(q.width), height: Math.round(q.height) }); })()`));
const grab = async (name) => {
  const r = await rect();
  const sy = await b.evalJs('window.scrollY');
  const { data } = await b.send("Page.captureScreenshot", { format: "png",
    clip: { x: r.x, y: r.y + sy, width: r.width, height: r.height, scale: 1 } });
  fs.writeFileSync(`${OUT}/${name}`, Buffer.from(data, "base64"));
};

// Force a fresh draw: switch to sheet 02 and watch the hand work.
const btn = JSON.parse(await b.evalJs(`
  (() => { const el = [...document.querySelectorAll('.am-idx')][1].getBoundingClientRect();
    return JSON.stringify({ x: Math.round(el.left + el.width/2), y: Math.round(el.top + el.height/2) }); })()`));
await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: btn.x, y: btn.y, button: "left", clickCount: 1 });
await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: btn.x, y: btn.y, button: "left", clickCount: 1 });

await sleep(500);  await grab("hand-1.png");
await sleep(600);  await grab("hand-2.png");
await sleep(700);  await grab("hand-3.png");
await sleep(1400); await grab("hand-4.png");

// the stone
const r = await rect();
const cx = Math.round(r.x + r.width * 0.44), cy = Math.round(r.y + r.height * 0.40);
await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx, y: cy });
for (let i = 0; i < 26; i++) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx + (i % 2), y: cy }); await sleep(40); }
await grab("stone.png");
console.log("errors:", await b.evalJs(`(window.__errs||[]).length`));
b.close();
