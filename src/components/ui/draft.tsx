/**
 * Draughting primitives — the conventions a real drawing is made of.
 *
 * Not an illustration kit. Cut material is poché'd with the hatch its own trade
 * uses, edges carry the weight their role gives them (a cut edge is heavy, a
 * visible one is light, a dimension is a hairline), dimensions are struck with
 * the architect's 45° tick rather than an engineer's arrowhead, and every
 * callout hangs off a leader with a shoulder. Get these right and the drawing
 * reads as a drawing; get them wrong and no amount of rendering will save it.
 */

export const INK = "#24231D";
export const MID = "rgba(36,35,29,0.62)";
export const HAIR = "rgba(36,35,29,0.34)";
export const GOLD = "#A2794A";

/** Line weights. The hierarchy IS the drawing. */
export const W_CUT = 1.5; // material the section passes through
export const W_VIS = 0.7; // seen, but not cut
export const W_THIN = 0.5; // dimensions, leaders, hatch bounds

/** A stroke that inks itself in. pathLength normalises every path to length 1. */
export function L({
  d,
  s = MID,
  w = W_VIS,
  cap = "butt",
}: {
  d: string;
  s?: string;
  w?: number;
  cap?: "butt" | "round";
}) {
  return (
    <path className="ink" d={d} pathLength={1} stroke={s} strokeWidth={w} fill="none" strokeLinecap={cap} strokeLinejoin="round" />
  );
}

/** Material in section: the poché, then the cut line around it. */
export function Cut({ d, fill, w = W_CUT }: { d: string; fill?: string; w?: number }) {
  return (
    <>
      {fill && <path className="poche" d={d} fill={fill} stroke="none" />}
      <path className="ink" d={d} pathLength={1} stroke={INK} strokeWidth={w} fill="none" strokeLinejoin="miter" />
    </>
  );
}

/** A rectangle in section — the shape almost every build-up is made of. */
export const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y} H${x + w} V${y + h} H${x} Z`;

/* ── Dimensions ───────────────────────────────────────────────────────────── */

const TICK = 3.4;

export function DimH({
  x1,
  x2,
  y,
  label,
  ext = 0,
  gold = false,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  /** How far the witness lines reach back toward the thing being measured. */
  ext?: number;
  gold?: boolean;
}) {
  const c = gold ? GOLD : MID;
  return (
    <g className="dwg-anno">
      {ext !== 0 && <L d={`M${x1} ${y - ext} V${y + 4} M${x2} ${y - ext} V${y + 4}`} s={HAIR} w={W_THIN} />}
      <L d={`M${x1} ${y} H${x2}`} s={c} w={W_THIN} />
      <L d={`M${x1 - TICK} ${y + TICK} l${TICK * 2} ${-TICK * 2} M${x2 - TICK} ${y + TICK} l${TICK * 2} ${-TICK * 2}`} s={c} w={W_THIN} />
      <text className="dwg-t" x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fill={c}>
        {label}
      </text>
    </g>
  );
}

export function DimV({
  y1,
  y2,
  x,
  label,
  ext = 0,
  gold = false,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  ext?: number;
  gold?: boolean;
}) {
  const c = gold ? GOLD : MID;
  return (
    <g className="dwg-anno">
      {ext !== 0 && <L d={`M${x - 4} ${y1} H${x + ext} M${x - 4} ${y2} H${x + ext}`} s={HAIR} w={W_THIN} />}
      <L d={`M${x} ${y1} V${y2}`} s={c} w={W_THIN} />
      <L d={`M${x - TICK} ${y1 + TICK} l${TICK * 2} ${-TICK * 2} M${x - TICK} ${y2 + TICK} l${TICK * 2} ${-TICK * 2}`} s={c} w={W_THIN} />
      <text
        className="dwg-t"
        x={x - 6}
        y={(y1 + y2) / 2}
        textAnchor="middle"
        fill={c}
        transform={`rotate(-90 ${x - 6} ${(y1 + y2) / 2})`}
      >
        {label}
      </text>
    </g>
  );
}

/* ── Callouts ─────────────────────────────────────────────────────────────── */

/** A leader: a dot on the thing, a line away from it, a shoulder, then the word. */
export function Note({
  x,
  y,
  to,
  at,
  label,
  side = "right",
}: {
  /** Where it points. */
  x: number;
  y: number;
  /** Where the shoulder starts. */
  to: number;
  at: number;
  label: string;
  side?: "right" | "left";
}) {
  const s = side === "right" ? 1 : -1;
  const end = to + 18 * s;
  return (
    <g className="dwg-anno">
      <circle className="fade" cx={x} cy={y} r={1.5} fill={GOLD} />
      <L d={`M${x} ${y} L${to} ${at} H${end}`} s={HAIR} w={W_THIN} />
      <text className="dwg-t" x={end + 5 * s} y={at + 3.5} textAnchor={side === "right" ? "start" : "end"} fill={MID}>
        {label}
      </text>
    </g>
  );
}

/** A free label — a room's name, a note in the margin. */
export function Text({
  x,
  y,
  children,
  anchor = "start",
  gold = false,
  big = false,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  gold?: boolean;
  big?: boolean;
}) {
  return (
    <text
      className={`dwg-t fade${big ? " dwg-t--big" : ""}`}
      x={x}
      y={y}
      textAnchor={anchor}
      fill={gold ? GOLD : MID}
    >
      {children}
    </text>
  );
}

/**
 * The break line. A detail is a fragment cut out of a real building, and saying
 * so — rather than drawing a wall that politely stops — is most of what makes a
 * drawing read as a drawing.
 */
export function Break({ x1, x2, y, vertical = false }: { x1: number; x2: number; y: number; vertical?: boolean }) {
  const n = 5;
  const step = (x2 - x1) / n;
  let d = vertical ? `M${y} ${x1}` : `M${x1} ${y}`;
  for (let i = 0; i < n; i++) {
    const a = x1 + step * (i + 0.5);
    const b = x1 + step * (i + 1);
    const off = i % 2 === 0 ? -4 : 4;
    d += vertical ? ` L${y + off} ${a} L${y} ${b}` : ` L${a} ${y + off} L${b} ${y}`;
  }
  return <L d={d} s={HAIR} w={W_THIN} />;
}

/** North. Every plan has one, and its absence is the first thing an eye misses. */
export function North({ x, y, r = 13 }: { x: number; y: number; r?: number }) {
  return (
    <g className="dwg-anno">
      <L d={`M${x} ${y - r} m${-r} ${r} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`} s={HAIR} w={W_THIN} />
      <path className="fade" d={`M${x} ${y - r + 2} L${x + 4} ${y + 3} L${x} ${y + 1} L${x - 4} ${y + 3} Z`} fill={INK} />
      <text className="dwg-t" x={x} y={y + r + 9} textAnchor="middle" fill={MID}>
        S
      </text>
    </g>
  );
}

/**
 * The hatches. Each is the convention its trade actually draws with — concrete
 * is stippled and slivered, insulation is struck at 45°, screed is stippled
 * fine, timber shows its grain. They are defined once for the page.
 */
export function DraftDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        <pattern id="h-rc" width="15" height="15" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="0.85" fill="rgba(36,35,29,0.5)" />
          <circle cx="10.5" cy="11.5" r="0.65" fill="rgba(36,35,29,0.42)" />
          <path d="M8.5 2.5 l3.4 2 -3.4 1.1 Z" fill="rgba(36,35,29,0.38)" />
          <path d="M1.5 10.5 l2.8 1.6 -2.8 1.1 Z" fill="rgba(36,35,29,0.32)" />
        </pattern>
        <pattern id="h-insul" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 V5.5" stroke="rgba(36,35,29,0.42)" strokeWidth="0.55" />
        </pattern>
        <pattern id="h-acou" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <path d="M0 0 V5.5" stroke="rgba(36,35,29,0.32)" strokeWidth="0.55" />
        </pattern>
        <pattern id="h-screed" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.3" cy="1.5" r="0.5" fill="rgba(36,35,29,0.45)" />
          <circle cx="3.7" cy="3.9" r="0.42" fill="rgba(36,35,29,0.36)" />
        </pattern>
        <pattern id="h-render" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 V3" stroke="rgba(36,35,29,0.3)" strokeWidth="0.45" />
        </pattern>
        {/* Sawn timber. At 4.5 units the grain closed up into a shutter; boards
            are read by their spacing as much as by their line. */}
        <pattern id="h-wood" width="16" height="11" patternUnits="userSpaceOnUse">
          <path d="M0 3 H16 M0 8 H16" stroke="rgba(36,35,29,0.24)" strokeWidth="0.45" />
        </pattern>
        <pattern id="h-earth" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 V3.4" stroke="rgba(36,35,29,0.26)" strokeWidth="0.45" />
        </pattern>
      </defs>
    </svg>
  );
}
