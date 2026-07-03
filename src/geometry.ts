export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Convert an orthogonal polyline into an SVG path with rounded corners. */
export function roundedPath(pts: Pt[], r = 10): string {
  if (pts.length < 2) return '';
  const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]!;
    const p = pts[i]!;
    const next = pts[i + 1]!;
    const d1 = dist(prev, p);
    const d2 = dist(p, next);
    if (d1 < 0.5 || d2 < 0.5) continue;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const a = lerp(p, prev, rr / d1);
    const b = lerp(p, next, rr / d2);
    d += ` L ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1]!;
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/** Point on a cubic bezier at parameter t. */
export function cubicAt(t: number, p0: Pt, c1: Pt, c2: Pt, p1: Pt): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
  };
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
