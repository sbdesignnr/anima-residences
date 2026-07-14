/**
 * Anima's own design primitives.
 *
 * Everything here is derived from two things the project already owns:
 *   1. the mark — an arch enclosing an "A" and an olive branch
 *   2. the architect's drawing — numeric annotations, hairlines, level tags
 *
 * The arch is the house shape. It frames things (cards, apertures) and marks
 * things (instead of the generic hairline rule). The annotation style is the
 * drawing's voice: tabular figures, tight tracking, never shouted.
 */

const BRASS = "#B69A78";

/** The mark, reduced to a hairline: arch + A + branch. */
export function ArchMark({
  size = 28,
  color = BRASS,
  strokeWidth = 1,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 40 56"
      fill="none"
      aria-hidden
      style={{ display: "block", overflow: "visible" }}
    >
      {/* outer arch */}
      <path
        d="M3 53V21a17 17 0 0 1 34 0v32"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {/* inner arch */}
      <path
        d="M8 53V21.5a12 12 0 0 1 24 0V53"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.55}
      />
      {/* the A */}
      <path d="M20 16 L28 47 M20 16 L12 47" stroke={color} strokeWidth={strokeWidth} />
      {/* olive branch, leaning on the A */}
      <path
        d="M14.5 45c2.5-5 5-9 8-12"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.9}
      />
      <path d="M16 40.5c-2.4-.6-3.4-2.4-3.2-4.4 2.2.3 3.6 1.9 3.2 4.4Z" fill={color} opacity={0.75} />
      <path d="M18.6 36.4c-2.1-1.2-2.5-3.2-1.7-5.1 2 .9 2.8 2.8 1.7 5.1Z" fill={color} opacity={0.75} />
      <path d="M20.4 40c2.1-1.2 4.1-.7 5.4.8-1.8 1.4-4 1.3-5.4-.8Z" fill={color} opacity={0.6} />
      {/* plinth */}
      <path d="M0 53h40" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

/**
 * A quiet section label: a short brass rule, then the label in restrained,
 * open-tracked caps. No index code — those "A.01 / F.02" plate numbers read as
 * a template, not a project.
 */
export function SheetRef({
  label,
  color = "rgba(242,237,230,0.55)",
  accent = BRASS,
}: {
  label: string;
  color?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ display: "block", width: "26px", height: "1px", backgroundColor: accent }} />
      <span className="annot" style={{ fontSize: "10px", color, textTransform: "uppercase", letterSpacing: "0.34em" }}>
        {label}
      </span>
    </div>
  );
}

/**
 * A level tag, copied from the drawing's own `±0,000` marks: a filled triangle
 * against a hairline, figures set tabular so the columns line up.
 */
export function LevelTag({ value, color = BRASS }: { value: string; color?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        style={{
          display: "block",
          width: 0,
          height: 0,
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: `6px solid ${color}`,
        }}
      />
      <span className="annot" style={{ fontSize: "10px", color }}>
        {value}
      </span>
    </span>
  );
}

/** The arch as an aperture: a panel with the mark's rounded head. */
export function archTop(width: number): React.CSSProperties {
  return { borderRadius: `${width / 2}px ${width / 2}px 2px 2px` };
}
