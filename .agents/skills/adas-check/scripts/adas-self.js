#!/usr/bin/env node
'use strict';

/**
 * adas-self — AUTO-AUDITORIA da governança do ADAS (o ADAS governa o ADAS).
 *
 * Irmão do adas-check.js (que audita o CÓDIGO contra as faixas): este audita a GOVERNANÇA em si —
 * pega o modo de falha nº1 desses sistemas (a constituição/decisões descolarem em silêncio).
 * Checa: constituição presente + sem placeholder; DECISIONS.md íntegro (índice × seções, sem
 * gap/dup); âncora (AGENTS.md) presente e apontando pra governança; toda skill com frontmatter
 * name+description (senão não dispara); DA-NNN citada nas skills mas ausente do DECISIONS.md.
 *
 * Cross-platform (DA-005): só fs/path do Node, sem shell. WARN por padrão; frontmatter quebrado = BLOCK.
 *   Uso: node .agents/skills/adas-check/scripts/adas-self.js [--root <dir>] [--json]
 */

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const out = { root: process.cwd(), json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') { out.root = argv[++i]; continue; }
    if (argv[i] === '--json') { out.json = true; continue; }
  }
  return out;
}

function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function walk(dir, hit) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full, hit));
    else if (hit(e.name, full)) out.push(full);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ROOT = args.root;
  const issues = []; // { sev: 'block'|'warn', msg }
  const add = (sev, msg) => issues.push({ sev, msg });

  const SPECS = path.join(ROOT, '.specs');
  const SKILLS = path.join(ROOT, '.agents', 'skills');
  const DECISIONS = path.join(ROOT, 'DECISIONS.md');
  // sentinela INEQUÍVOCO de bootstrap — não `<scope>`/`<módulo>` etc., que são notação legítima em doc de arquitetura
  const PLACEHOLDER = /<PLACEHOLDER>|<PROJETO>|<TODO>/;

  // 1) constituição presente + sem placeholder
  if (!exists(SPECS)) add('warn', '.specs/ ausente — sem constituição');
  for (const f of walk(SPECS, (n) => /\.(md|css|json)$/.test(n))) {
    if (PLACEHOLDER.test(read(f) || '')) add('warn', `placeholder não preenchido: ${path.relative(ROOT, f)}`);
  }

  // 2) DECISIONS.md presente + índice × seções (sem gap/dup)
  const dec = read(DECISIONS);
  if (!dec) add('warn', 'DECISIONS.md ausente — sem log de decisões');
  else {
    const idx = [...dec.matchAll(/^\s*-\s*\*\*DA-(\d{3})\*\*/gm)].map((m) => +m[1]);
    const sec = [...dec.matchAll(/^##\s*Decis.+DA-(\d{3})|^##\s*DA-(\d{3})/gm)].map((m) => +(m[1] || m[2]));
    const secSet = new Set(sec);
    for (const n of idx) if (!secSet.has(n)) add('warn', `DA-${String(n).padStart(3, '0')} no índice mas sem seção completa`);
    const dup = sec.filter((n, i) => sec.indexOf(n) !== i);
    if (dup.length) add('warn', `DA duplicada no DECISIONS.md: ${[...new Set(dup)].join(', ')}`);
  }

  // 3) âncora presente e apontando pra governança
  let anchor = ['AGENTS.md', 'CLAUDE.md', '.cursorrules'].map((a) => path.join(ROOT, a)).find(exists);
  if (!anchor) add('warn', 'sem arquivo-âncora (AGENTS.md/CLAUDE.md) — a ferramenta não descobre a governança');
  else if (!/DECISIONS\.md|\.specs|skills/.test(read(anchor) || '')) add('warn', `âncora ${path.basename(anchor)} não aponta pra governança`);

  // 4) toda skill com frontmatter name+description (senão não dispara) = BLOCK
  for (const f of walk(SKILLS, (n) => n === 'SKILL.md')) {
    if (/[/\\]_template[/\\]/.test(f)) continue;
    const head = (read(f) || '').split('\n').slice(0, 16).join('\n');
    if (!/^name:/m.test(head) || !/^description:/m.test(head)) add('block', `skill sem frontmatter name/description: ${path.relative(ROOT, f)} (não dispara)`);
  }

  // 5) DA-NNN citada nas skills mas ausente do DECISIONS.md
  if (dec) {
    const cited = new Set();
    for (const f of walk(SKILLS, (n) => n === 'SKILL.md')) for (const m of (read(f) || '').matchAll(/DA-(\d{3})/g)) cited.add(m[1]);
    for (const n of cited) if (!new RegExp(`DA-${n}`).test(dec)) add('warn', `DA-${n} citada numa skill mas ausente do DECISIONS.md`);
  }

  const blocks = issues.filter((i) => i.sev === 'block');
  const warns = issues.filter((i) => i.sev === 'warn');

  if (args.json) { console.log(JSON.stringify({ ok: blocks.length === 0, blocks, warns }, null, 2)); process.exit(blocks.length ? 1 : 0); }

  for (const i of issues) console.log(`${i.sev === 'block' ? '✗' : '•'} ${i.msg}`);
  if (blocks.length) { console.log('\n✗ adas-self: governança quebrada (frontmatter) — corrija'); process.exit(1); }
  if (warns.length) { console.log('\n⚠ adas-self: avisos de higiene da governança (acima) — não bloqueia'); process.exit(0); }
  console.log('✓ adas-self: governança íntegra (.specs + DECISIONS + âncora + skills com trigger)');
}

main();
