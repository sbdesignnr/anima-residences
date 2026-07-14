import { launch, sleep } from "./cdp.mjs";
const OUT = "/private/tmp/claude-501/-Users-samuelbiben-Projects-anima-residences/a9df38b6-3ebb-465b-953d-ea38261c6cfc/scratchpad";
// home CTA
{
  const b = await launch({ w: 1500, h: 1000, touch: false, profile: "h1" });
  await b.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await b.send("Page.setWebLifecycleState", { state: "active" });
  await b.goto("http://localhost:3000/");
  await sleep(1500);
  await b.evalJs(`document.querySelector('#financovanie-cta').scrollIntoView({block:'center'}); true`);
  await sleep(2600);
  await b.shot(`${OUT}/fx-home.png`);
  b.close();
}
// mobile calculator
{
  const b = await launch({ w: 390, h: 844, touch: true, profile: "h2" });
  await b.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await b.send("Page.setWebLifecycleState", { state: "active" });
  await b.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await b.goto("http://localhost:3000/financovanie");
  await sleep(1500);
  await b.evalJs(`document.querySelector('#kalkulacka').scrollIntoView({block:'start'}); true`);
  await sleep(2200);
  await b.shot(`${OUT}/fx-m1.png`);
  await b.evalJs(`window.scrollBy(0, 780); true`); await sleep(1600);
  await b.shot(`${OUT}/fx-m2.png`);
  console.log("mobile:", await b.evalJs(`JSON.stringify({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    errors: (window.__errs||[]).length })`));
  b.close();
}
