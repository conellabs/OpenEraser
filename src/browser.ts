// Entry point for the browser bundle inlined into HTML artifacts.
// Bundled by scripts/build-artifact.ts as an IIFE with global name `openEraser`.
export { render } from './render.js';
export { parse, ParseError } from './parser.js';
export { themes } from './theme.js';
export { iconManifest } from './icons.js';
