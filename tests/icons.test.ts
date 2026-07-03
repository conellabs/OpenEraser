import { describe, expect, it } from 'vitest';
import { iconManifest, iconSvgByName, keywordRules, resolveIcon } from '../src/icons.js';

describe('icon manifest style contract', () => {
  it('has unique kebab-case names and non-empty descriptions', () => {
    const names = iconManifest.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
    for (const d of iconManifest) {
      expect(d.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(d.description.length).toBeGreaterThan(5);
    }
  });

  it('uses only allowed stroke elements', () => {
    const tagRe = /<(\w[\w-]*)/g;
    const allowed = new Set(['path', 'line', 'polyline', 'polygon', 'circle', 'ellipse', 'rect']);
    for (const d of iconManifest) {
      for (const m of d.svg.matchAll(tagRe)) {
        expect(allowed.has(m[1]!), `${d.name} uses <${m[1]}>`).toBe(true);
      }
    }
  });

  it('never sets paint attributes (renderer owns stroke/fill)', () => {
    for (const d of iconManifest) {
      expect(d.svg, `${d.name} sets paint attrs`).not.toMatch(/\b(fill|stroke|stroke-width)=/);
    }
  });

  it('stays within the 24x24 viewBox', () => {
    const numRe = /(?:x\d?|y\d?|cx|cy|r|rx|ry|width|height)="(-?[\d.]+)"/g;
    for (const d of iconManifest) {
      for (const m of d.svg.matchAll(numRe)) {
        const v = Number(m[1]);
        expect(v, `${d.name}: ${m[0]}`).toBeGreaterThanOrEqual(-0.01);
        expect(v, `${d.name}: ${m[0]}`).toBeLessThanOrEqual(24.01);
      }
    }
  });
});

describe('keyword rules', () => {
  it('every rule targets an icon that exists in the manifest', () => {
    for (const [re, name] of keywordRules) {
      expect(iconSvgByName.has(name), `rule ${re} -> missing icon '${name}'`).toBe(true);
    }
  });

  it('resolves domain-typical labels sensibly', () => {
    expect(resolveIcon('3.3V LDO Regulator')).toBe('regulator');
    expect(resolveIcon('Sensor Chamber')).toBe('enclosure'); // chamber beats sensor
    expect(resolveIcon('SPI Interface')).toBe('bus');
    expect(resolveIcon('User Interface')).toBe('layout'); // not bus
    expect(resolveIcon('GPIO Controls')).toBe('pins');
    expect(resolveIcon('ADC Channels')).toBe('adc');
    expect(resolveIcon('Breath Sample Tube')).toBe('tube');
    expect(resolveIcon('DC-DC Converter')).toBe('regulator'); // not adc
    expect(resolveIcon('WiFi Module')).toBe('wifi');
    expect(resolveIcon('Status LED')).toBe('led');
    expect(resolveIcon('Power Switch')).toBe('switch'); // switch beats power/zap
  });
});
