export interface ThemeConfig {
  background: string;
  font: string;
  group: { fill: string; stroke: string; radius: number };
  node: { fill: string; stroke: string; radius: number; title: string; subtitle: string };
  edge: { stroke: string; width: number; label: string; labelBg: string };
  /** Accents assigned to groups (by index) when no usable color is authored. */
  accentPalette: string[];
  /** Accent for top-level nodes and near-gray authored colors. */
  defaultAccent: string;
}

export const darkTheme: ThemeConfig = {
  background: '#0b0d12',
  font: `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  group: { fill: '#12151c', stroke: '#232834', radius: 14 },
  node: { fill: '#1c212b', stroke: '#2e3543', radius: 10, title: '#e8ecf3', subtitle: '#8b94a7' },
  edge: { stroke: '#525b6b', width: 1.6, label: '#aab3c5', labelBg: '#161a23' },
  accentPalette: ['#60a5fa', '#f59e0b', '#8b5cf6', '#22c55e', '#f97316', '#ec4899'],
  defaultAccent: '#60a5fa',
};

export const themes = { dark: darkTheme };

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r!)}${to(g!)}${to(b!)}`;
}

/**
 * Authors (and Mermaid conventions) tend to specify light pastel fills meant
 * for white backgrounds. Keep the hue — it carries intent — but re-saturate
 * and darken so it works as an accent on the dark theme.
 */
export function normalizeAccent(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!m) return fallback;
  const num = parseInt(m[1]!, 16);
  const r = ((num >> 16) & 0xff) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (l <= 0.7) return `#${m[1]}`;
  const d = max - min;
  if (d < 0.02) return fallback; // near-gray: no meaningful hue to preserve
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return hslToHex(h, 0.72, 0.62);
}
