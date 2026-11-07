# Contributing

Open Eraser is early software. Bug reports, focused fixes, compatibility
fixtures, and documentation improvements are welcome.

## Setup

Requirements:

- Node.js 22 or newer
- pnpm 11.9.0 or a compatible pnpm 11 release

```bash
git clone https://github.com/conellabs/OpenEraser.git
cd OpenEraser
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

## Before proposing a change

- Open an issue before large parser, layout, API, or format changes.
- Keep the renderer deterministic and offline.
- Do not add network services, AI calls, or browser automation to the core
  render path.
- Do not describe unsupported Mermaid syntax as supported.
- Add a fixture or focused test for parser and layout fixes.
- Do not commit files under `dist/` or `generated/`.

## Adding Mermaid syntax

1. Add parser tests for accepted and rejected forms.
2. Add rendering or layout coverage where the syntax changes output.
3. Update the supported-subset section in `README.md`.
4. Keep parse errors line-numbered and actionable.

## Adding an icon

1. Add the icon to `src/icons.ts` and follow its style contract.
2. Record whether the glyph is original or adapted from another project.
3. Add or update third-party attribution when required.
4. Run `pnpm icon-sheet` and inspect the generated contact sheet.
5. Run `pnpm test` and `pnpm build`.

## Pull-request checks

A change is expected to pass:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm check:package
```

Keep pull requests small enough to review. Explain user-visible behavior,
limitations, and any compatibility impact.

## Security reports

Do not open a public issue for a suspected vulnerability. Follow
[`SECURITY.md`](SECURITY.md).

## License

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE). Only submit work you have the right to
license, and preserve attribution for adapted third-party material.
