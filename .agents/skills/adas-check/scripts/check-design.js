#!/usr/bin/env node
'use strict';

/**
 * adas-check — faixa DESIGN (modo compare / drift-check)
 *
 * Sensor de saída de faixa do design system: varre arquivos de UI e reporta
 * cada cor hex que NÃO faz parte do token set aprovado, com arquivo:linha e o
 * token aprovado mais próximo (sugestão de fix). Determinístico, zero LLM.
 *
 * Uso:
 *   node check-design.js <dir-alvo> [--profile holdge] [--json]
 *
 * Cross-platform (Windows/Linux): só fs/path do Node, sem shell.
 */

const fs = require('node:fs');
const path = require('node:path');

// --- Perfis de token (a "pista"). Holdge primeiro; outros projetos = novo perfil. ---
const PROFILES = {
  holdge: {
    // tokens aprovados (ADAS faixa Design). Tudo fora disto é drift.
    green: '#00ff73', greenHover: '#00e666',
    cyan: '#00e5ff', cyanAlt: '#00ffff',
    yellow: '#ffcc00', danger: '#ff4444',
    bgBase: '#0a0a0a', bgSurface: '#121212', bgElevated: '#1a1a1a', bgInput: '#0f0f0f',
    borderSubtle: '#333333', borderStrong: '#555555',
    textPrimary: '#ffffff', textSecondary: '#aaaaaa', textMuted: '#666666',
    btnText: '#000000',
  },
};

const UI_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.vue', '.svelte']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'vendor', '.git', '.next', '.turbo', 'coverage']);
const HEX_RE = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;

function parseArgs(argv) {
  const out = { dir: null, profile: 'holdge', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--profile') { out.profile = argv[++i]; continue; }
    if (a === '--json') { out.json = true; continue; }
    if (a.startsWith('--')) { fail(`Argumento desconhecido: ${a}`); }
    out.dir = a;
  }
  if (!out.dir) fail('Informe o diretório alvo. Ex.: node check-design.js ./resources/js');
  if (!PROFILES[out.profile]) fail(`Perfil "${out.profile}" não existe. Disponíveis: ${Object.keys(PROFILES).join(', ')}`);
  return out;
}

function fail(msg) { console.error(`\n✖ ${msg}`); process.exit(1); }

function normalizeHex(hex) {
  let h = hex.toLowerCase();
  if (h.length === 4) h = '#' + [...h.slice(1)].map((c) => c + c).join(''); // #abc -> #aabbcc
  return h;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function colorDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function nearestToken(hex, approvedList) {
  let best = null;
  let bestD = Infinity;
  for (const t of approvedList) {
    const d = colorDistance(hex, t);
    if (d < bestD) { bestD = d; best = t; }
  }
  return { token: best, distance: Math.round(bestD) };
}

function walk(dir, files) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, files);
    } else if (UI_EXTENSIONS.has(path.extname(e.name))) {
      files.push(full);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.dir);
  const approved = new Set(Object.values(PROFILES[args.profile]).map(normalizeHex));
  const approvedList = [...approved];

  const files = [];
  walk(rootDir, files);

  // hexNormalizado -> { count, locations: [{file,line}] }
  const rogue = new Map();
  let totalApproved = 0;

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      const matches = line.match(HEX_RE);
      if (!matches) return;
      for (const m of matches) {
        const norm = normalizeHex(m);
        if (approved.has(norm)) { totalApproved += 1; continue; }
        if (!rogue.has(norm)) rogue.set(norm, { count: 0, locations: [] });
        const entry = rogue.get(norm);
        entry.count += 1;
        if (entry.locations.length < 8) {
          entry.locations.push(`${path.relative(rootDir, file)}:${idx + 1}`);
        }
      }
    });
  }

  const rogueSorted = [...rogue.entries()].sort((a, b) => b[1].count - a[1].count);
  const totalRogueOcc = rogueSorted.reduce((n, [, v]) => n + v.count, 0);

  if (args.json) {
    console.log(JSON.stringify({
      lane: 'design', profile: args.profile, dir: rootDir,
      filesScanned: files.length, approvedOccurrences: totalApproved,
      rogueColors: rogueSorted.length, rogueOccurrences: totalRogueOcc,
      departures: rogueSorted.map(([hex, v]) => ({ hex, count: v.count, ...nearestToken(hex, approvedList), sample: v.locations })),
    }, null, 2));
    return;
  }

  console.log(`\n=== ADAS drift-check · faixa DESIGN · perfil "${args.profile}" ===`);
  console.log(`Alvo: ${rootDir}`);
  console.log(`Arquivos varridos: ${files.length} | hex aprovados: ${totalApproved}`);
  console.log(`\nSAÍDAS DE FAIXA: ${rogueSorted.length} cores fora do token set (${totalRogueOcc} ocorrências)\n`);

  if (rogueSorted.length === 0) {
    console.log('✅ Nenhum hex fora da pista. Design system aderente.');
    return;
  }

  for (const [hex, v] of rogueSorted) {
    const { token, distance } = nearestToken(hex, approvedList);
    const sev = v.count >= 20 ? 'major' : v.count >= 5 ? 'minor' : 'nit';
    console.log(`[${sev}] ${hex}  (${v.count}×)  → use ${token} (Δ${distance})`);
    console.log(`        ${v.locations.slice(0, 4).join('  ')}${v.count > 4 ? '  …' : ''}`);
  }

  console.log(`\nFix: trocar cada hex acima pelo token sugerido (ou centralizar em CSS vars/tema e referenciar var(--token)).`);
}

main();
