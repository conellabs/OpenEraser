import { cubicAt, escapeXml, roundedPath } from './geometry.js';
import type { Pt } from './geometry.js';
import { iconSvgByName } from './icons.js';
import type { DiagramLayout, PlacedNode } from './layout.js';
import type { ThemeConfig } from './theme.js';
import type { DiagramEdge } from './types.js';

const MARGIN = 30;

export function renderSvg(layout: DiagramLayout, theme: ThemeConfig): string {
  const W = layout.width + MARGIN * 2;
  const H = layout.height + MARGIN * 2;
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${theme.font}">`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="${theme.edge.stroke}"/></marker></defs>`,
    `<rect width="${W}" height="${H}" fill="${theme.background}"/>`,
    `<g transform="translate(${MARGIN},${MARGIN})">`,
  );

  // Group containers, outermost first so nested boxes draw on top.
  for (const pg of [...layout.groups].sort((a, b) => a.depth - b.depth)) {
    const { rect: r, accent, group } = pg;
    out.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${theme.group.radius}" fill="${theme.group.fill}" stroke="${theme.group.stroke}"/>`,
      `<circle cx="${r.x + 24}" cy="${r.y + 28}" r="4" fill="${accent}"/>`,
      `<text x="${r.x + 36}" y="${r.y + 32.5}" font-size="13" font-weight="700" letter-spacing="0.4" fill="${accent}">${escapeXml(group.label)}</text>`,
    );
  }

  const dashFor = (e: DiagramEdge) =>
    e.style === 'dashed' ? ` stroke-dasharray="7 5"` : e.style === 'dotted' ? ` stroke-dasharray="2 4"` : '';
  const markerFor = (e: DiagramEdge) => (e.arrowType === 'none' ? '' : ` marker-end="url(#arrow)"`);

  const labels: { text: string; at: Pt }[] = [];

  // Intra-group edges: orthogonal with rounded corners.
  for (const { edge, points } of layout.intraEdges) {
    out.push(
      `<path d="${roundedPath(points)}" fill="none" stroke="${theme.edge.stroke}" stroke-width="${theme.edge.width}"${dashFor(edge)}${markerFor(edge)}/>`,
    );
    if (edge.label) labels.push({ text: edge.label, at: points[Math.floor(points.length / 2)]! });
  }

  // Cross-group edges: beziers.
  for (const { edge, start, c1, c2, end } of layout.crossEdges) {
    out.push(
      `<path d="M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}" fill="none" stroke="${theme.edge.stroke}" stroke-width="${theme.edge.width}" stroke-opacity="0.8"${dashFor(edge)}${markerFor(edge)}/>`,
    );
    if (edge.label) labels.push({ text: edge.label, at: cubicAt(0.5, start, c1, c2, end) });
  }

  // Nodes.
  for (const pn of layout.nodes) out.push(...renderNode(pn, theme));

  // Edge labels (top layer).
  for (const { text, at } of labels) {
    const w = text.length * 6.4 + 14;
    const h = 20;
    out.push(
      `<rect x="${(at.x - w / 2).toFixed(1)}" y="${(at.y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="6" fill="${theme.edge.labelBg}" stroke="${theme.group.stroke}"/>`,
      `<text x="${at.x.toFixed(1)}" y="${(at.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.edge.label}">${escapeXml(text)}</text>`,
    );
  }

  out.push('</g></svg>');
  return out.join('\n');
}

// Icon resolution (the fallback chain) happens in render() before layout, so
// node.icon here is already validated against the manifest.
function renderNode(pn: PlacedNode, theme: ThemeConfig): string[] {
  const { node: n, rect: r, accent } = pn;
  const out: string[] = [];
  const lines = n.label.split('\n');
  out.push(
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${theme.node.radius}" fill="${theme.node.fill}" stroke="${theme.node.stroke}"/>`,
  );
  let textX = r.x + 16;
  const icon = n.icon;
  if (icon && iconSvgByName.has(icon)) {
    const cy = r.y + r.h / 2 - 15;
    out.push(
      `<rect x="${r.x + 12}" y="${cy}" width="30" height="30" rx="8" fill="${accent}1f" stroke="${accent}40"/>`,
      `<svg x="${r.x + 19}" y="${cy + 7}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvgByName.get(icon)}</svg>`,
    );
    textX = r.x + 52;
  }
  const startY = r.y + r.h / 2 - ((lines.length - 1) * 15) / 2 + 4;
  lines.forEach((line, i) => {
    const isTitle = i === 0;
    out.push(
      `<text x="${textX}" y="${startY + i * 15}" font-size="${isTitle ? 12 : 10.5}" font-weight="${isTitle ? 600 : 400}" fill="${isTitle ? theme.node.title : theme.node.subtitle}">${escapeXml(line)}</text>`,
    );
  });
  return out;
}
