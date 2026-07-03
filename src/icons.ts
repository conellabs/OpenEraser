/**
 * Icon manifest: the closed vocabulary of semantic icon names.
 *
 * This is the single source of truth for icons. The planning-agent prompt
 * snippet is generated from `iconManifest` (scripts/gen-vocab.ts) so the
 * agent's vocabulary and the renderer can never drift apart. Names are
 * semantic ("what it means"), never visual ("what it looks like").
 *
 * STYLE CONTRACT (enforced by tests/icons.test.ts):
 *   - 24x24 viewBox coordinate space
 *   - stroke-only: 2px stroke applied by the renderer; glyphs must not set
 *     fill, stroke, or stroke-width themselves
 *   - allowed elements: path, line, polyline, polygon, circle, ellipse, rect
 *   - keep ~2px padding from the viewBox edge; 3-6 strokes per glyph —
 *     at 16px render size, simple beats detailed
 *
 * We own this set (see plan, decided 2026-06-13). Individual glyphs may be
 * adapted from Lucide (https://lucide.dev, ISC license); the rest are
 * original. Grow the set demand-driven: render with `onIconMiss` and add
 * what real diagrams ask for.
 */
export interface IconDef {
  name: string;
  description: string;
  svg: string;
}

export const iconManifest: IconDef[] = [
  // --- Power -----------------------------------------------------------------
  {
    name: 'battery',
    description: 'Batteries, energy storage',
    svg: '<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/>',
  },
  {
    name: 'zap',
    description: 'Power rails, voltage, energy flow',
    svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  },
  {
    name: 'regulator',
    description: 'Voltage regulators, LDOs, DC-DC converters',
    svg: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  },
  {
    name: 'charger',
    description: 'Battery chargers, charging circuits',
    svg: '<path d="M7 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"/><path d="M15 7h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><line x1="22" y1="11" x2="22" y2="13"/><polyline points="11 6 7 12 13 12 9 18"/>',
  },
  {
    name: 'solar',
    description: 'Solar panels, energy harvesting',
    svg: '<rect x="4" y="14" width="16" height="7" rx="1"/><line x1="9" y1="14" x2="9" y2="21"/><line x1="15" y1="14" x2="15" y2="21"/><circle cx="12" cy="6" r="2.5"/><line x1="12" y1="1" x2="12" y2="2"/><line x1="7" y1="6" x2="6" y2="6"/><line x1="18" y1="6" x2="17" y2="6"/>',
  },
  {
    name: 'plug',
    description: 'Power input, DC jacks, mains connection',
    svg: '<path d="M12 22v-4"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 7h12l-1.5 7a3 3 0 0 1-3 2.5h-3A3 3 0 0 1 7.5 14Z"/>',
  },

  // --- Control / compute -------------------------------------------------------
  {
    name: 'mcu',
    description: 'Microcontrollers, processors, SoCs',
    svg: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/><line x1="9" y1="19" x2="9" y2="22"/><line x1="15" y1="19" x2="15" y2="22"/><line x1="2" y1="9" x2="5" y2="9"/><line x1="2" y1="15" x2="5" y2="15"/><line x1="19" y1="9" x2="22" y2="9"/><line x1="19" y1="15" x2="22" y2="15"/>',
  },
  {
    name: 'memory',
    description: 'RAM, flash, EEPROM, memory chips',
    svg: '<rect x="3" y="5" width="18" height="11" rx="1"/><line x1="7" y1="16" x2="7" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="17" y1="16" x2="17" y2="20"/><line x1="8" y1="8" x2="8" y2="13"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="16" y1="8" x2="16" y2="13"/>',
  },
  {
    name: 'storage',
    description: 'Databases, bulk storage',
    svg: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  },
  {
    name: 'sd-card',
    description: 'SD cards, removable storage',
    svg: '<path d="M18 22H6a2 2 0 0 1-2-2V8l5-5h9a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2Z"/><line x1="9" y1="7" x2="9" y2="10"/><line x1="13" y1="7" x2="13" y2="10"/><line x1="17" y1="7" x2="17" y2="10"/>',
  },
  {
    name: 'clock',
    description: 'Clocks, timers, RTC',
    svg: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
  },
  {
    name: 'gear',
    description: 'Control logic, configuration, processing blocks',
    svg: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="7.1" y2="7.1"/><line x1="16.9" y1="16.9" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="7.1" y2="16.9"/><line x1="16.9" y1="7.1" x2="18.7" y2="5.3"/>',
  },

  // --- Interfaces / communication ----------------------------------------------
  {
    name: 'bus',
    description: 'Data buses and serial interfaces (SPI, I2C, UART, CAN)',
    svg: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  },
  {
    name: 'pins',
    description: 'GPIO, pin headers, discrete I/O',
    svg: '<rect x="4" y="3" width="16" height="8" rx="1"/><line x1="8" y1="11" x2="8" y2="21"/><line x1="12" y1="11" x2="12" y2="21"/><line x1="16" y1="11" x2="16" y2="21"/>',
  },
  {
    name: 'adc',
    description: 'ADCs, DACs, analog-digital conversion',
    svg: '<path d="M2 12c1.5-5 3.5-5 5 0s3.5 5 5 0"/><path d="M13 15v-6h3v6h3v-6h3"/>',
  },
  {
    name: 'antenna',
    description: 'Antennas, RF and radio links',
    svg: '<line x1="12" y1="21" x2="12" y2="8"/><path d="M6 3l6 6 6-6"/>',
  },
  {
    name: 'wifi',
    description: 'Wi-Fi connectivity',
    svg: '<path d="M2 9.5a15 15 0 0 1 20 0"/><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  },
  {
    name: 'bluetooth',
    description: 'Bluetooth, BLE connectivity',
    svg: '<polyline points="7 7 17 17 12 22 12 2 17 7 7 17"/>',
  },
  {
    name: 'usb',
    description: 'USB ports and connections',
    svg: '<circle cx="10" cy="7" r="1"/><circle cx="4" cy="20" r="1"/><path d="M4.7 19.3 19 5"/><path d="m21 3-3 1 2 2Z"/><path d="M9.26 7.68 5 12l2 5"/><path d="m10 14 5 2 3.5-3.5"/><path d="m18 12 1-1 1 1-1 1Z"/>',
  },
  {
    name: 'cloud',
    description: 'Cloud services, remote backends',
    svg: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
  },
  {
    name: 'server',
    description: 'Servers, gateways, hubs',
    svg: '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/>',
  },

  // --- Sensing -------------------------------------------------------------------
  {
    name: 'sensor',
    description: 'Measurement or detection devices',
    svg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  },
  {
    name: 'thermometer',
    description: 'Temperature sensing',
    svg: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  },
  {
    name: 'gauge',
    description: 'Meters, gauges, measurement readouts',
    svg: '<path d="M3 15a9 9 0 0 1 18 0"/><line x1="12" y1="15" x2="16.5" y2="10.5"/><circle cx="12" cy="15" r="1"/>',
  },
  {
    name: 'camera',
    description: 'Cameras, imaging sensors',
    svg: '<path d="M5 7h2l2-3h6l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/>',
  },
  {
    name: 'microphone',
    description: 'Microphones, audio input',
    svg: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/>',
  },

  // --- Discrete components ---------------------------------------------------------
  {
    name: 'op-amp',
    description: 'Amplifiers, signal conditioning',
    svg: '<path d="M5 4v16l15-8z"/><line x1="7.5" y1="9" x2="10.5" y2="9"/><line x1="7.5" y1="15" x2="10.5" y2="15"/><line x1="9" y1="7.5" x2="9" y2="10.5"/>',
  },
  {
    name: 'crystal',
    description: 'Crystals, oscillators, clock sources',
    svg: '<line x1="6" y1="7" x2="6" y2="17"/><rect x="9" y="6" width="6" height="12" rx="1"/><line x1="18" y1="7" x2="18" y2="17"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>',
  },
  {
    name: 'transistor',
    description: 'Transistors, MOSFETs, switching elements',
    svg: '<circle cx="12" cy="12" r="8"/><line x1="9" y1="8" x2="9" y2="16"/><line x1="4" y1="12" x2="9" y2="12"/><line x1="9" y1="10" x2="15" y2="6"/><line x1="9" y1="14" x2="15" y2="18"/>',
  },
  {
    name: 'diode',
    description: 'Diodes, rectifiers',
    svg: '<line x1="2" y1="12" x2="8" y2="12"/><path d="M8 6v12l8-6Z"/><line x1="16" y1="6" x2="16" y2="18"/><line x1="16" y1="12" x2="22" y2="12"/>',
  },
  {
    name: 'led',
    description: 'LEDs, indicator lights',
    svg: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
  },
  {
    name: 'resistor',
    description: 'Resistors, loads',
    svg: '<polyline points="2 12 6 12 8 7 11 17 14 7 17 17 19 12 22 12"/>',
  },
  {
    name: 'capacitor',
    description: 'Capacitors, decoupling, energy buffering',
    svg: '<line x1="2" y1="12" x2="9" y2="12"/><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/><line x1="15" y1="12" x2="22" y2="12"/>',
  },
  {
    name: 'inductor',
    description: 'Inductors, coils, chokes',
    svg: '<path d="M2 14a2.5 2.5 0 0 1 5 0"/><path d="M7 14a2.5 2.5 0 0 1 5 0"/><path d="M12 14a2.5 2.5 0 0 1 5 0"/><path d="M17 14a2.5 2.5 0 0 1 5 0"/>',
  },
  {
    name: 'relay',
    description: 'Relays, contactors, isolated switching',
    svg: '<rect x="2" y="8" width="8" height="8" rx="1"/><line x1="10" y1="12" x2="13" y2="12"/><circle cx="14.5" cy="16.5" r="1"/><circle cx="20.5" cy="8.5" r="1"/><line x1="15.2" y1="15.8" x2="19.8" y2="9.2"/>',
  },

  // --- Human interface --------------------------------------------------------------
  {
    name: 'display',
    description: 'Screens, LCDs, displays',
    svg: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  },
  {
    name: 'layout',
    description: 'User interfaces, panels, dashboards',
    svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="21"/>',
  },
  {
    name: 'speaker',
    description: 'Buzzers, speakers, audio output',
    svg: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.6 5.4a9.5 9.5 0 0 1 0 13.2"/>',
  },
  {
    name: 'button',
    description: 'Buttons, user input controls',
    svg: '<path d="M18.4 6.6a9 9 0 1 1-12.8 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
  },
  {
    name: 'switch',
    description: 'Switches, toggles',
    svg: '<rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3"/>',
  },

  // --- Electromechanical / fluid -------------------------------------------------------
  {
    name: 'motor',
    description: 'Motors, servos, actuators',
    svg: '<circle cx="10" cy="12" r="7"/><circle cx="10" cy="12" r="2"/><line x1="17" y1="12" x2="22" y2="12"/>',
  },
  {
    name: 'fan',
    description: 'Fans, pumps, forced airflow',
    svg: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  },
  {
    name: 'wind',
    description: 'Air, gas flow, ventilation',
    svg: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  },
  {
    name: 'valve',
    description: 'Valves, flow control',
    svg: '<path d="M4 7v10l8-5Z"/><path d="M20 7v10l-8-5Z"/><line x1="12" y1="12" x2="12" y2="5"/><line x1="9" y1="5" x2="15" y2="5"/>',
  },
  {
    name: 'tube',
    description: 'Tubes, pipes, fluid or sample paths',
    svg: '<rect x="9" y="2" width="6" height="20" rx="3"/><line x1="9" y1="8" x2="15" y2="8"/>',
  },
  {
    name: 'enclosure',
    description: 'Chambers, enclosures, housings',
    svg: '<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 10h18"/><circle cx="12" cy="15.5" r="2"/>',
  },

  // --- Software / systems ------------------------------------------------------
  {
    name: 'code',
    description: 'APIs, endpoints, code modules',
    svg: '<polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/><line x1="13.5" y1="4" x2="10.5" y2="20"/>',
  },
  {
    name: 'queue',
    description: 'Message queues, brokers, event streams',
    svg: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="11" height="4" rx="1"/><polyline points="18 16 21 18 18 20"/>',
  },
  {
    name: 'browser',
    description: 'Browsers, web frontends, client apps',
    svg: '<rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><circle cx="5.5" cy="6.5" r="0.5"/><circle cx="8.5" cy="6.5" r="0.5"/>',
  },
  {
    name: 'package',
    description: 'Packages, modules, libraries, dependencies',
    svg: '<path d="M21 8v8l-9 5-9-5V8l9-5 9 5Z"/><polyline points="3 8 12 13 21 8"/><line x1="12" y1="13" x2="12" y2="21"/>',
  },
  {
    name: 'git-branch',
    description: 'Repositories, branches, version control',
    svg: '<line x1="6" y1="4" x2="6" y2="15"/><circle cx="18" cy="7" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M18 9.5a8.5 8.5 0 0 1-8.5 8.5"/>',
  },
  {
    name: 'file',
    description: 'Files, documents, source artifacts',
    svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="17.5" x2="13" y2="17.5"/>',
  },
  {
    name: 'terminal',
    description: 'CLIs, shells, build tools',
    svg: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="6 9 10 12 6 15"/><line x1="12" y1="15.5" x2="17" y2="15.5"/>',
  },
  {
    name: 'lock',
    description: 'Auth, secrets, credentials, security',
    svg: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.5"/>',
  },
  {
    name: 'user',
    description: 'Users, accounts, actors',
    svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><line x1="9" y1="21" x2="15" y2="21"/>',
  },
];

export const iconSvgByName: ReadonlyMap<string, string> = new Map(iconManifest.map((d) => [d.name, d.svg]));

/**
 * Keyword fallback (fallback chain step 2): used when a node has no usable
 * icon directive. First matching rule wins — order specific terms before
 * generic ones (e.g. 'chamber' before 'sensor' so "Sensor Chamber" gets the
 * enclosure icon, and 'regulator' before 'power' so LDOs don't get the zap).
 */
const KEYWORD_RULES: readonly [RegExp, string][] = [
  [/regulator|\bldo\b|buck|boost|dc-dc/i, 'regulator'],
  [/charger|charging/i, 'charger'],
  [/solar/i, 'solar'],
  [/microcontroller|\bmcu\b|cortex|processor|\bcpu\b|\bsoc\b/i, 'mcu'],
  [/amplifier|op-?amp/i, 'op-amp'],
  [/thermometer|temperature/i, 'thermometer'],
  [/chamber|enclosure|housing/i, 'enclosure'],
  [/\btube\b|\bpipe\b/i, 'tube'],
  [/valve/i, 'valve'],
  [/\badc\b|\bdac\b/i, 'adc'],
  [/\bgpio\b|pin header|pinout/i, 'pins'],
  [/\bspi\b|\bi2c\b|\buart\b|\bcan bus\b|data bus/i, 'bus'],
  [/camera|imaging/i, 'camera'],
  [/microphone|\bmic\b/i, 'microphone'],
  [/gauge|\bmeter\b/i, 'gauge'],
  [/sensor|detector/i, 'sensor'],
  [/battery|alkaline/i, 'battery'],
  [/switch|toggle/i, 'switch'],
  [/display|\blcd\b|\boled\b|screen/i, 'display'],
  [/buzzer|speaker|audio/i, 'speaker'],
  [/button/i, 'button'],
  [/pump|\bfan\b|blower/i, 'fan'],
  [/\bair\b|ventilation|airflow/i, 'wind'],
  [/antenna|\brf\b/i, 'antenna'],
  [/wi-?fi/i, 'wifi'],
  [/bluetooth|\bble\b/i, 'bluetooth'],
  [/\busb\b/i, 'usb'],
  [/\bled\b/i, 'led'],
  [/motor|servo|actuator/i, 'motor'],
  [/relay|contactor/i, 'relay'],
  [/transistor|mosfet|\bbjt\b/i, 'transistor'],
  [/diode|rectifier/i, 'diode'],
  [/resistor/i, 'resistor'],
  [/capacitor/i, 'capacitor'],
  [/inductor|\bcoil\b|choke/i, 'inductor'],
  [/crystal|oscillator|\bxtal\b/i, 'crystal'],
  [/memory|\bram\b|flash|eeprom/i, 'memory'],
  [/database|storage/i, 'storage'],
  [/sd card|micro-?sd/i, 'sd-card'],
  [/cloud/i, 'cloud'],
  [/server|gateway|backend/i, 'server'],
  [/clock|timer|\brtc\b|scheduler|\bcron\b/i, 'clock'],
  [/user interface|\bui\b|dashboard|\bpanel\b/i, 'layout'],
  // Software / systems (specific before generic, same as above)
  [/queue|kafka|rabbit|broker|pub-?sub|event stream/i, 'queue'],
  [/auth|login|token|secret|credential|oauth|\bsso\b/i, 'lock'],
  [/\bgit\b|repo\b|branch|version control/i, 'git-branch'],
  [/package|module|library|dependency|\bnpm\b|\bsdk\b/i, 'package'],
  [/terminal|\bcli\b|shell|command line|build tool/i, 'terminal'],
  [/browser|frontend|web ?app|webpage|client app/i, 'browser'],
  [/\bapi\b|endpoint|\brpc\b|graphql|\brest\b/i, 'code'],
  [/\bfile\b|document|markdown|\bmdx\b|artifact/i, 'file'],
  [/\buser\b|account|customer|actor/i, 'user'],
  [/\brail\b|voltage|power/i, 'zap'],
];

/**
 * Resolve a node's icon through the fallback chain:
 * override -> authored directive -> keyword match -> undefined (themed block).
 * Unknown names never break a render; they fall through to the next step.
 */
export function resolveIcon(label: string, declared?: string, override?: string): string | undefined {
  for (const candidate of [override, declared]) {
    if (candidate && iconSvgByName.has(candidate)) return candidate;
  }
  for (const [re, name] of KEYWORD_RULES) {
    if (re.test(label)) return name;
  }
  return undefined;
}

/** Exported for the style-contract tests and vocabulary generator. */
export const keywordRules: readonly [RegExp, string][] = KEYWORD_RULES;
