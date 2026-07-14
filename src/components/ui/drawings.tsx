/**
 * Six sheets out of the project.
 *
 * Each is a drawing type an architect actually issues — a wall section, a floor
 * build-up, a plan fragment, an annotated elevation, a bay layout, a site plan.
 * Nothing is stylised into a picture of the thing; it IS the thing, drawn: cut
 * material poché'd, edges weighted, dimensions struck, callouts on leaders.
 *
 * THE SHEET IS 620 UNITS WIDE AND EVERYTHING HAS TO FIT ON IT. A label is set at
 * ~7 units per character, so a 22-character callout is ~155 units long. That
 * means a left-hand leader's shoulder can never sit below x≈186, and a
 * right-hand one never above x≈434 — past those the words run off the paper.
 * Every callout below is placed against that rule.
 *
 * Figures are indicative. The lead architect should confirm every dimension and
 * layer thickness against the issued documentation before this goes live.
 */

import {
  Break,
  Cut,
  DimH,
  DimV,
  GOLD,
  HAIR,
  INK,
  L,
  MID,
  North,
  Note,
  rect,
  Text,
  W_CUT,
  W_THIN,
  W_VIS,
} from "@/components/ui/draft";

const VB = "0 0 620 440";

/* ── 01 · Rez obvodovou stenou ─────────────────────────────────────────────
 * The wall, cut. Exterior on the left, and every layer poché'd in the hatch its
 * own trade uses, so the build-up can be read rather than believed.
 */
export function DwgWall() {
  const y0 = 86;
  const y1 = 342;
  const b = [196, 206, 296, 396, 406]; // layer boundaries, exterior → interior

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      <Break x1={b[0]} x2={b[4]} y={y0} />
      <Break x1={b[0]} x2={b[4]} y={y1} />

      <Cut d={rect(b[0], y0, b[1] - b[0], y1 - y0)} fill="url(#h-render)" w={W_VIS} />
      <Cut d={rect(b[1], y0, b[2] - b[1], y1 - y0)} fill="url(#h-insul)" />
      <Cut d={rect(b[2], y0, b[3] - b[2], y1 - y0)} fill="url(#h-rc)" />
      <Cut d={rect(b[3], y0, b[4] - b[3], y1 - y0)} fill="url(#h-render)" w={W_VIS} />

      <Text x={128} y={y0 - 16} anchor="middle">EXTERIÉR</Text>
      <Text x={496} y={y0 - 16} anchor="middle">INTERIÉR</Text>
      <L d={`M128 ${y0 - 10} v12 m-4 -5 l4 5 4 -5`} s={HAIR} w={W_THIN} />
      <L d={`M496 ${y0 - 10} v12 m-4 -5 l4 5 4 -5`} s={HAIR} w={W_THIN} />

      <Note x={201} y={124} to={190} at={106} label="FASÁDNA OMIETKA 15" side="left" />
      <Note x={252} y={188} to={190} at={166} label="MINERÁLNA IZOLÁCIA 180" side="left" />
      <Note x={348} y={146} to={428} at={124} label="ŽELEZOBETÓN 200" side="right" />
      <Note x={401} y={210} to={428} at={186} label="VNÚTORNÁ OMIETKA 15" side="right" />

      <DimH x1={b[0]} x2={b[1]} y={y1 + 34} label="15" ext={30} />
      <DimH x1={b[1]} x2={b[2]} y={y1 + 34} label="180" ext={30} />
      <DimH x1={b[2]} x2={b[3]} y={y1 + 34} label="200" ext={30} />
      <DimH x1={b[3]} x2={b[4]} y={y1 + 34} label="15" ext={30} />
      <DimH x1={b[0]} x2={b[4]} y={y1 + 62} label="410" ext={60} gold />

      <Text x={604} y={y1 + 62} anchor="end" gold>U = 0,15 W/m²K</Text>
    </svg>
  );
}

/* ── 02 · Dvere 2400 + skladba podlahy ─────────────────────────────────────
 * Two sheets on one. The door is drawn against the height everybody else builds
 * to, because that comparison is the whole claim. The floor is cut.
 */
export function DwgInterior() {
  const fl = 356;
  const dx = 74;
  const dw = 118;
  const dh = 300; // 2400 mm
  const std = fl - (1970 / 2400) * dh;

  const fx0 = 302;
  const fx1 = 418;
  const f = [148, 156, 182, 198, 296]; // build-up, y boundaries

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      {/* ── the door ── */}
      <L d={`M40 ${fl} H250`} s={INK} w={W_CUT} />
      <path className="poche" d={rect(40, fl, 210, 13)} fill="url(#h-earth)" />

      <Cut d={rect(dx, fl - dh, dw, dh)} w={W_VIS} />
      {/* A door in elevation is flush. Grain drawn across it read as a shutter. */}
      <Cut d={rect(dx + 7, fl - dh + 7, dw - 14, dh - 7)} fill="rgba(36,35,29,0.035)" w={W_VIS} />
      <L d={`M${dx + dw - 19} ${fl - 142} v18`} s={GOLD} w={2.2} cap="round" />

      {/* what everyone else builds to */}
      <path className="fade" d={`M${dx - 22} ${std} H${dx + dw + 22}`} stroke={GOLD} strokeWidth={W_THIN} strokeDasharray="5 4" fill="none" />
      <Text x={dx + dw + 27} y={std + 3.5} gold>BEŽNÝ ŠTANDARD 1970</Text>

      <DimV y1={fl - dh} y2={fl} x={46} label="2400" ext={22} gold />
      <DimH x1={dx} x2={dx + dw} y={fl + 34} label="900" ext={26} />

      {/* ── the floor, cut ── */}
      <Break x1={f[0]} x2={f[4]} y={fx0} vertical />
      <Break x1={f[0]} x2={f[4]} y={fx1} vertical />

      <Cut d={rect(fx0, f[0], fx1 - fx0, f[1] - f[0])} fill="url(#h-wood)" w={W_VIS} />
      <Cut d={rect(fx0, f[1], fx1 - fx0, f[2] - f[1])} fill="url(#h-screed)" />
      <Cut d={rect(fx0, f[2], fx1 - fx0, f[3] - f[2])} fill="url(#h-acou)" w={W_VIS} />
      <Cut d={rect(fx0, f[3], fx1 - fx0, f[4] - f[3])} fill="url(#h-rc)" />

      <Note x={fx1 - 26} y={f[0] + 4} to={424} at={f[0] - 16} label="DREVENÁ PODLAHA 15" />
      <Note x={fx1 - 26} y={f[1] + 13} to={424} at={f[1] + 4} label="ANHYDRITOVÝ POTER 50" />
      <Note x={fx1 - 26} y={f[2] + 8} to={424} at={f[2] + 26} label="KROČAJOVÁ IZOLÁCIA 30" />
      <Note x={fx1 - 26} y={f[3] + 44} to={424} at={f[3] + 56} label="ŽB DOSKA 200" />

      <DimV y1={f[0]} y2={f[4]} x={fx0 - 24} label="295" ext={20} />
    </svg>
  );
}

/* ── 03 · Pôdorys prízemia ─────────────────────────────────────────────────
 * A plan. Walls are cut, so they are the heaviest thing on the sheet; the door
 * shows its swing; the lift is crossed; the stair is arrowed the way you climb.
 */
export function DwgPlan() {
  const T = 9;
  const x0 = 80;
  const x1 = 542;
  const y0 = 84;
  const y1 = 336;
  const dL = 190; // the opening in the bottom wall
  const dR = 296;
  const leaf = fromTo(dL, dR);

  const wall = (x: number, y: number, w: number, h: number) => <Cut d={rect(x, y, w, h)} fill={INK} w={0.4} />;

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      {/* the envelope, cut. Widths, not end coordinates — the bottom-left run
          was written as 190 (its end) and left a second hole in the wall. */}
      {wall(x0, y0, x1 - x0, T)}
      {wall(x0, y0, T, y1 - y0)}
      {wall(x1 - T, y0, T, y1 - y0)}
      {wall(x0, y1 - T, dL - x0, T)}
      {wall(dR, y1 - T, x1 - dR, T)}
      {wall(392, y0, T, y1 - y0)}

      {/* the way in: the leaf swings open, and the arc is the swing */}
      <L d={`M${dL} ${y1 - T} v${T} M${dR} ${y1 - T} v${T}`} s={HAIR} w={W_THIN} />
      <L d={`M${dL} ${y1 - T} V${y1 - T - leaf}`} s={GOLD} w={1.8} />
      <L d={`M${dL} ${y1 - T - leaf} A${leaf} ${leaf} 0 0 1 ${dR} ${y1 - T}`} s={HAIR} w={W_THIN} />

      {/* the lift, crossed as a lift always is */}
      <Cut d={rect(238, 150, 60, 60)} w={W_VIS} />
      <L d={`M238 150 L298 210 M298 150 L238 210`} s={HAIR} w={W_THIN} />
      <Text x={268} y={228} anchor="middle">VÝŤAH</Text>

      {/* the stair, and which way it goes */}
      <Cut d={rect(110, 132, 92, 90)} w={W_VIS} />
      {[0, 1, 2, 3, 4].map((i) => (
        <L key={i} d={`M110 ${146 + i * 15} h92`} s={HAIR} w={W_THIN} />
      ))}
      <L d={`M156 216 V140 m-5 8 l5 -8 5 8`} s={GOLD} w={1} cap="round" />
      <Text x={156} y={240} anchor="middle">SCHODISKO</Text>

      <Text x={236} y={110} anchor="middle" big>VSTUPNÁ HALA</Text>
      <Text x={236} y={126} anchor="middle">28,4 m²</Text>

      {/* prams and bicycles, clear of the door's swing */}
      <Cut d={rect(98, 252, 86, 64)} w={W_VIS} />
      <path className="poche" d={rect(98, 252, 86, 64)} fill="url(#h-earth)" />
      <Text x={141} y={288} anchor="middle">KOČÍKAREŇ</Text>

      {/* the courtyard */}
      <path className="poche" d={rect(401, y0 + T, x1 - T - 401, y1 - y0 - 2 * T)} fill="url(#h-earth)" />
      <Text x={466} y={198} anchor="middle" big>VNÚTROBLOK</Text>
      <Text x={466} y={214} anchor="middle">ZELEŇ · POSEDENIE</Text>

      <DimH x1={x0} x2={392} y={y1 + 24} label="12 400" ext={20} />
      <DimH x1={x0} x2={x1} y={y1 + 52} label="18 600" ext={48} gold />
      <North x={578} y={116} />
    </svg>
  );
}

const fromTo = (a: number, b: number) => b - a;

/* ── 04 · Vstup — pohľad s popismi ─────────────────────────────────────────
 * The entrance, drawn straight on, with every piece of the access control
 * called out. An annotated elevation is how a door is specified; there is no
 * need to invent anything more expressive than that.
 */
export function DwgEntrance() {
  const fl = 350;
  const wx0 = 190; // the wall the door is in — kept narrow so the callouts fit
  const wx1 = 430;
  const wt = 292; // wall height shown
  const dx = 250;
  const dw = 120;
  const dh = 272;

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      <L d={`M60 ${fl} H560`} s={INK} w={W_CUT} />
      <path className="poche" d={rect(60, fl, 500, 12)} fill="url(#h-earth)" />

      {/* the wall it is set in */}
      <Cut d={rect(wx0, fl - wt, wx1 - wx0, wt)} fill="url(#h-render)" w={W_VIS} />

      {/* two leaves, glazed */}
      <Cut d={rect(dx, fl - dh, dw, dh)} w={W_VIS} />
      <L d={`M${dx + dw / 2} ${fl - dh} v${dh}`} s={MID} w={W_VIS} />
      {[0, 1].map((i) => (
        <Cut key={i} d={rect(dx + 8 + i * (dw / 2), fl - dh + 10, dw / 2 - 16, dh - 38)} w={W_THIN} />
      ))}
      <L d={`M${dx + dw / 2 - 7} ${fl - 140} v36 M${dx + dw / 2 + 7} ${fl - 140} v36`} s={GOLD} w={2.4} cap="round" />

      {/* the reader, on the wall */}
      <Cut d={rect(208, fl - 160, 20, 32)} w={W_VIS} />
      <circle className="fade" cx={218} cy={fl - 144} r={4.5} fill="none" stroke={GOLD} strokeWidth={1.1} />

      {/* the intercom */}
      <Cut d={rect(388, fl - 186, 32, 60)} w={W_VIS} />
      <L d={`M394 ${fl - 179} h20 v22 h-20 Z`} s={HAIR} w={W_THIN} />
      {[0, 1, 2].map((i) => (
        <L key={i} d={`M394 ${fl - 150 + i * 6} h20`} s={HAIR} w={W_THIN} />
      ))}

      {/* the camera */}
      <Cut d={rect(384, fl - wt + 6, 38, 16)} w={W_VIS} />
      <L d={`M422 ${fl - wt + 10} l12 -5 v20 l-12 -5`} s={MID} w={W_VIS} />

      <Note x={218} y={fl - 144} to={176} at={fl - 208} label="BEZKĽÚČOVÁ ČÍTAČKA" side="left" />
      <Note x={404} y={fl - 170} to={444} at={fl - 206} label="VIDEOVRÁTNIK" side="right" />
      <Note x={403} y={fl - wt + 14} to={444} at={fl - wt - 12} label="KAMERA" side="right" />
      {/* routed UNDER the intercom — a leader may not cross what it is not pointing at */}
      <Note x={dx + dw / 2 + 7} y={fl - 122} to={444} at={fl - 66} label="ELEKTRICKÝ ZÁMOK" side="right" />

      <DimH x1={dx} x2={dx + dw} y={fl + 36} label="1400" ext={28} />
      <DimV y1={fl - dh} y2={fl} x={162} label="2600" ext={20} gold />
    </svg>
  );
}

/* ── 05 · Parkovacie státie ────────────────────────────────────────────────
 * A bay, at the size it is actually built, with the car that has to fit in it
 * and the charger it is prepared for. The cellar comes with it.
 */
export function DwgParking() {
  const bx = 142;
  const by = 88;
  const bw = 150; // 2500
  const bh = 296; // 5000

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      {/* the neighbours, so it reads as one bay in a row */}
      <L d={`M${bx - 68} ${by} v${bh} M${bx} ${by} v${bh} M${bx + bw} ${by} v${bh} M${bx + bw + 60} ${by} v${bh}`} s={HAIR} w={W_THIN} />
      <L d={`M${bx - 68} ${by} H${bx + bw + 60} M${bx - 68} ${by + bh} H${bx + bw + 60}`} s={HAIR} w={W_THIN} />

      {/* yours */}
      <path className="poche" d={rect(bx, by, bw, bh)} fill="rgba(162,121,74,0.07)" />
      <Cut d={rect(bx, by, bw, bh)} w={1.1} />

      {/* the car, in plan */}
      <Cut
        d={`M${bx + 26} ${by + 38} h98 a11 11 0 0 1 11 11 v196 a11 11 0 0 1 -11 11 h-98 a11 11 0 0 1 -11 -11 v-196 a11 11 0 0 1 11 -11 Z`}
        w={W_VIS}
      />
      {/* screen, roof, rear glass */}
      <L d={`M${bx + 30} ${by + 82} h90 M${bx + 30} ${by + 212} h90`} s={HAIR} w={W_THIN} />
      <L d={`M${bx + 36} ${by + 98} h78 v76 h-78 Z`} s={HAIR} w={W_THIN} />
      {/* mirrors */}
      <L d={`M${bx + 15} ${by + 92} h-9 M${bx + 135} ${by + 92} h9`} s={HAIR} w={W_THIN} />
      {/* wheels */}
      {[[bx + 11, by + 60], [bx + 11, by + 196], [bx + 122, by + 60], [bx + 122, by + 196]].map(([x, y], i) => (
        <Cut key={i} d={rect(x, y, 17, 34)} w={W_THIN} />
      ))}

      {/* the charger, and the run to the car */}
      <Cut d={rect(bx - 46, by + 132, 26, 44)} fill="url(#h-render)" w={W_VIS} />
      <path
        className="fade"
        d={`M${bx - 20} ${by + 154} C ${bx - 4} ${by + 154}, ${bx + 2} ${by + 178}, ${bx + 14} ${by + 178}`}
        stroke={GOLD}
        strokeWidth={1.3}
        fill="none"
      />
      {/* the leader runs UP, not left — there is no paper to the left of it */}
      <Note x={bx - 33} y={by + 154} to={bx - 33} at={54} label="PRÍPRAVA NA NABÍJANIE" side="right" />

      {/* the cellar */}
      <path className="poche" d={rect(404, 150, 156, 128)} fill="url(#h-earth)" />
      <Cut d={rect(404, 150, 156, 128)} w={W_VIS} />
      <L d={`M456 278 v9 M508 278 v9`} s={HAIR} w={W_THIN} />
      <L d={`M460 284 h44`} s={GOLD} w={1.5} />
      <Text x={482} y={208} anchor="middle" big>PIVNIČNÁ KOBKA</Text>
      <Text x={482} y={224} anchor="middle">4,2 m²</Text>

      <DimH x1={bx} x2={bx + bw} y={by + bh + 34} label="2500" ext={30} gold />
      <DimV y1={by} y2={by + bh} x={342} label="5000" ext={-28} gold />
    </svg>
  );
}

/* ── 06 · Situácia ─────────────────────────────────────────────────────────
 * Where it is. The plot is a dash-dot line because that is what a boundary is;
 * the circles are what you can reach on foot.
 */
export function DwgSite() {
  const cx = 300;
  const cy = 218;

  const amenity: [number, number, string][] = [
    [172, 112, "PARK"],
    [446, 146, "ŠKOLA"],
    [468, 300, "OBCHOD"],
    [156, 330, "ZASTÁVKA MHD"],
  ];

  return (
    <svg className="dwg" viewBox={VB} fill="none" aria-hidden>
      {[
        [84, "5 MIN"],
        [152, "10 MIN"],
      ].map(([r, t]) => (
        <g key={t as string}>
          <circle className="fade" cx={cx} cy={cy} r={r as number} fill="none" stroke={HAIR} strokeWidth={W_THIN} strokeDasharray="6 5" />
          <Text x={cx} y={cy - (r as number) - 7} anchor="middle">{t as string}</Text>
        </g>
      ))}

      {/* the street */}
      <L d="M40 386 H580" s={MID} w={W_VIS} />
      <L d="M40 406 H580" s={MID} w={W_VIS} />
      <path className="fade" d="M40 396 H580" stroke={HAIR} strokeWidth={W_THIN} strokeDasharray="12 9" fill="none" />

      {/* the plot */}
      <path className="fade" d={rect(214, 148, 176, 190)} fill="none" stroke={GOLD} strokeWidth={W_THIN} strokeDasharray="14 4 2 4" />

      {/* the building — a footprint is poché'd solid, always */}
      <Cut d={rect(248, 178, 110, 78)} fill={INK} w={0.4} />
      <Cut d={rect(248, 256, 74, 36)} fill="url(#h-rc)" w={W_VIS} />
      <Text x={302} y={360} anchor="middle" gold big>ANIMA RESIDENCES</Text>

      {amenity.map(([x, y, t]) => (
        <g key={t}>
          <circle className="fade" cx={x} cy={y} r={3} fill={MID} />
          <Text x={x} y={y - 9} anchor="middle">{t}</Text>
        </g>
      ))}

      <North x={562} y={80} />
      <Text x={40} y={62} big>SITUÁCIA · NITRA</Text>
      <L d="M40 72 H154" s={GOLD} w={1} />
    </svg>
  );
}
