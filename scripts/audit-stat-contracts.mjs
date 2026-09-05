#!/usr/bin/env node
/**
 * Stat-contract audit — every dashboard `*Stats` interface vs the response
 * component its endpoint actually publishes.
 *
 * ⚠️ **Why this exists.** Five of the six dashboards have, at some point, shipped
 * stat tiles bound to fields the API never sends (FLAG-222, FLAG-227, FLAG-231,
 * plus Org Admin and Nurse, both since fixed). `StatCard` renders
 * `{value ?? '—'}`, so the failure mode is an em dash rather than an error:
 * invisible to unit tests, because the fixtures are typed from the same wrong
 * interface (FLAG-221).
 *
 * Until 2026-09-03 this check was impossible — the schema documented
 * `200: No response body` for every stats endpoint (FLAG-225), so each dashboard
 * had to be caught by rendering it, which needed credentials per role. Backend
 * #161 published the bodies, so the whole class is now measurable in one pass,
 * **with no credentials**.
 *
 *   node scripts/audit-stat-contracts.mjs                 # fetch live schema
 *   node scripts/audit-stat-contracts.mjs path/to.json    # or use a saved one
 *
 * Exit code is the number of phantom fields, so CI can gate on it once
 * FLAG-230 is fixed. Full findings: FLAG-232.
 *
 * 🔑 **This checks PRESENCE, not correctness of type.** Backend FLAG-554 records
 * six nested fields in this same batch published as `string` where the value is
 * an integer or an object. A green run here does not mean the payload is right —
 * capture it live before shipping a retype.
 */
import { readFileSync } from 'node:fs';

const SCHEMA_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'https://api-dev.healthclouda.com/api/v1';
const TYPES = 'src/types/dashboard.ts';

/** interface name → the GET path whose 200 it is meant to describe */
const MAP = [
  ['DASH-1 Superadmin', 'SuperadminStats', '/api/v1/superadmin/dashboard/'],
  ['DASH-2 Org Admin', 'OrgAdminStats', '/api/v1/org-admin/dashboard/stats/'],
  ['DASH-3 Nurse', 'NurseStats', '/api/v1/nurse/dashboard/stats/'],
  ['DASH-4 Receptionist', 'ReceptionistStats', '/api/v1/receptionist/dashboard/stats/'],
  ['DASH-5 Doctor', 'DoctorStats', '/api/v1/doctor/dashboard/stats/'],
  ['DASH-6 Patient', 'PatientDashboardData', '/api/v1/patients/me/dashboard/'],
];

async function loadSchema() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(readFileSync(arg, 'utf8'));
  // The schema needs no auth — verified repeatedly; only live *data* needs a token.
  const res = await fetch(`${SCHEMA_URL}/schema/?format=json`);
  if (!res.ok) throw new Error(`schema fetch failed: ${res.status}`);
  return res.json();
}

/** Parse straight out of the source so the audit cannot drift from the types. */
function parseInterface(src, name) {
  const m = src.match(new RegExp(`export interface ${name}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split('\n')) {
    const f = line.match(/^\s*([A-Za-z0-9_]+)(\??):\s*([^;]+);/);
    if (f) fields[f[1]] = { optional: f[2] === '?', type: f[3].trim() };
  }
  return fields;
}

function published(schema, path) {
  const op = schema.paths?.[path]?.get;
  if (!op) return { err: 'path not in schema' };
  const content = op.responses?.['200']?.content;
  if (!content) return { err: 'no response body published (the FLAG-225 state)' };
  const ref = Object.values(content)[0].schema?.$ref;
  if (!ref) return { err: 'inline schema, no $ref' };
  const name = ref.split('/').pop();
  return { name, props: schema.components.schemas[name].properties ?? {} };
}

// OpenAPI integer and number both map to TS number. null = don't judge.
const compatible = (ts, sch) => {
  const t = ts.replace(/\s*\|\s*null/, '').trim();
  if (t === 'number') return sch === 'integer' || sch === 'number';
  if (t === 'string') return sch === 'string';
  return null;
};

const schema = await loadSchema();
const src = readFileSync(TYPES, 'utf8');
let phantoms = 0;
const rows = [];

for (const [label, iface, path] of MAP) {
  const ours = parseInterface(src, iface);
  const pub = published(schema, path);
  if (!ours) {
    console.log(`\n${label}: !! interface ${iface} not found in ${TYPES}`);
    continue;
  }
  if (pub.err) {
    console.log(`\n${label}: !! ${pub.err} (${path})`);
    continue;
  }

  const missing = [];
  const typeBad = [];
  for (const [f, meta] of Object.entries(ours)) {
    if (!(f in pub.props)) {
      missing.push(f);
    } else if (compatible(meta.type, pub.props[f].type) === false) {
      typeBad.push(`${f}: ours=${meta.type} published=${pub.props[f].type}`);
    }
  }
  const unused = Object.keys(pub.props).filter((f) => !(f in ours));
  phantoms += missing.length;

  console.log(`\n${'='.repeat(74)}\n${label}  ${iface} → ${pub.name}`);
  console.log(`  matching: ${Object.keys(ours).length - missing.length}/${Object.keys(ours).length}`);
  if (missing.length) console.log(`  ❌ PHANTOM (we read, API does not publish): ${missing.join(', ')}`);
  if (typeBad.length) console.log(`  ⚠️  type mismatch: ${typeBad.join(' | ')}`);
  if (unused.length) console.log(`  💤 published but unused: ${unused.join(', ')}`);
  rows.push({ label, missing: missing.length, unused: unused.length });
}

console.log(`\n${'='.repeat(74)}\nSUMMARY`);
for (const r of rows) {
  console.log(
    `  ${r.label.padEnd(22)}${r.missing ? `🔴 ${r.missing} phantom` : '✅ clean'}` +
      (r.unused ? `   (${r.unused} published-unused)` : ''),
  );
}
console.log(`\n  total phantom fields: ${phantoms}`);
if (phantoms) {
  console.log(
    '\n  Retype the interface from the published component AND a live capture.\n' +
      '  Never add the missing field to the fixture — that is how this survives a\n' +
      '  green unit suite (FLAG-221). See FLAG-232.',
  );
}
process.exit(phantoms);
