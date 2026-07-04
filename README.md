# openEraser

Deterministic renderer that turns Mermaid flowcharts into professional-quality
architecture diagrams — delivered as self-contained offline HTML artifacts.

## Overview

Wire.AI's planning agent emits system-architecture diagrams as Mermaid
flowcharts. Stock Mermaid.js renders them functional but visually basic. This
package renders the *same* Mermaid source at Eraser.io-level quality: icon
chips, themed group containers, smooth edge routing. It is fully deterministic
and offline — no LLM calls, no API keys, no network. Same input, same output.

Currently an internal Wire.AI package; designed for later extraction as a
standalone open-source library. Full design history and decisions:
[`Plan/open-eraser-plan.md`](../Plan/open-eraser-plan.md).

## Prerequisites

- Node.js (any recent LTS; uses npm, not the repo's uv workspace)

## Setup

```bash
cd open-eraser
npm install
```

## How to run

```bash
npm test                # full test suite (parser, layout, render, icons, artifact)
npm run pipeline        # render fixtures/breathalyzer-detailed.mmd -> generated/pipeline-*.html
npm run build           # build dist/artifact-template.html (~1.4 MB) + generated/icon-vocabulary.md
npm run demo-artifact   # produce a real two-diagram artifact from the fixtures
```

Open the generated `.html` files in any browser — they work offline.

## Library API

```ts
import { render, parse, themes } from '@conellabs/open-eraser';

const svg = await render(mermaidText, {
  theme: themes.dark,                      // default
  icons: { overrides: { MCU: 'mcu' } },    // optional per-node icon mapping
  onIconMiss: (n) => console.log(n.id),    // nodes that fell through every icon fallback
});
```

There is deliberately no LLM/enrichment option: icon selection happens at
authoring time via `%% icons: NODE=name` directives in the Mermaid source,
with a keyword fallback for unannotated nodes.

## Folder structure

```
open-eraser/
├── src/
│   ├── parser.ts      # Mermaid flowchart subset -> DiagramAST
│   ├── layout.ts      # hybrid layout (per-group ELK + root ELK + bezier cross-edges)
│   ├── svg.ts         # layout geometry -> styled SVG string
│   ├── render.ts      # public render() API; icon fallback chain
│   ├── icons.ts       # owned icon manifest (46 icons) + keyword rules
│   ├── theme.ts       # ThemeConfig, dark theme, accent normalization
│   └── browser.ts     # entry point for the IIFE bundle (global `openEraser`)
├── template/
│   └── artifact.html  # viewer shell: tabs, pan/zoom, SVG download
├── scripts/
│   ├── build-artifact.ts  # esbuild bundle + inline into template -> dist/
│   ├── make-artifact.ts   # reference data injection (escaping rules for ports)
│   ├── pipeline.ts        # dev tool: render a fixture end to end
│   ├── gen-vocab.ts       # icon manifest -> generated/icon-vocabulary.md
│   └── icon-sheet.ts      # visual QA contact sheet for all icons
├── fixtures/          # Breathalyzer .mmd files — acceptance fixtures
├── tests/             # vitest suites
├── generated/         # derived outputs (vocabulary, QA sheets) — never committed
└── docs/              # spike-result.png — the visual quality baseline
```

## How it works

```
Mermaid text -> parse() -> DiagramAST -> layoutDiagram() -> renderSvg() -> SVG
```

Layout is the **hybrid strategy**: each subgraph is laid out independently
with ELK (compact orthogonal routing), groups become fixed-size boxes in a
root ELK pass, and cross-group edges are drawn as direct bezier curves with
obstacle-aware bowing. ELK's built-in `INCLUDE_CHILDREN` hierarchical mode was
tried and rejected — read "Layout Spike Learnings" in the plan before
attempting layout changes.

## Artifact integration contract

`dist/artifact-template.html` contains one placeholder, `__OPEN_ERASER_DATA__`.
A consumer (e.g. the Wire.AI CLI) produces a finished artifact with a single
string replacement — no Node required at generation time:

```python
data = json.dumps({"title": title, "diagrams": [{"name": n, "mermaid": m}, ...]})
html = template.replace("__OPEN_ERASER_DATA__", data.replace("</", r"<\/"))
```

Escaping rules (tested in `tests/artifact.test.ts`): `</` must become `<\/`,
and the replacement must be literal (beware `$`-pattern substitution).
Reference implementation: `scripts/make-artifact.ts`.

## Icons

The icon set is **owned by this package** (no Lucide dependency; individual
glyphs may be adapted under ISC). Adding an icon:

1. Add a manifest entry in `src/icons.ts` following the style contract in the
   file header (24×24, stroke-only, 3–6 strokes).
2. `npm run icon-sheet` and eyeball `generated/icon-sheet.html`.
3. `npm test` — the style contract is enforced.
4. `npm run build` — regenerates both the template and the agent-facing
   vocabulary; consumers pick the new icon up automatically.

`render(..., { onIconMiss })` reports nodes that fell through every fallback —
that miss list is the queue for new icons.

## Common commands

| Command | Purpose |
|---------|---------|
| `npm test` / `npm run test:watch` | run / watch the test suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run pipeline [-- fixture.mmd]` | render a fixture end to end |
| `npm run build` | build the artifact template into `dist/` |
| `npm run demo-artifact` | build a sample artifact (requires `build` first) |
| `npm run icon-sheet` | icon QA contact sheet |
| `npm run gen-vocab` | regenerate `generated/icon-vocabulary.md` |
