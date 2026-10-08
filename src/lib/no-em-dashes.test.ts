import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * FLAG-071 — no em dashes in on-screen text (owner, 6 Oct). They had spread to
 * ~170 lines across every dashboard. Sentences now use a full stop, comma or
 * colon, and an empty value shows an en dash (–).
 *
 * This scans the source rather than rendered pages, so it catches text on
 * screens no other test renders. Comments are skipped: they never reach a user.
 */

// Files allowed to keep an em dash, and why.
const EXEMPT: Record<string, string> = {
  // A build-time error for developers (missing NEXT_PUBLIC_API_URL), never shown in the app.
  'src/lib/config.ts': 'developer-only build error',
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** Lines of code (not comments) containing an em dash, as "file:line". */
function emDashLines(file: string): string[] {
  const hits: string[] = [];
  let inBlockComment = false;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const s = line.trim();
    if (inBlockComment) {
      if (s.includes('*/')) inBlockComment = false;
      return;
    }
    if (s.startsWith('/*') || s.startsWith('{/*')) {
      if (!s.includes('*/')) inBlockComment = true;
      return;
    }
    if (s.startsWith('//') || s.startsWith('*')) return;
    const code = line.replace(/\s\/\/\s.*$/, '');
    if (code.includes('\u2014')) hits.push(`${file}:${i + 1}`);
  });
  return hits;
}

describe('FLAG-071 — no em dashes in on-screen text', () => {
  it('no source file outside the exempt list puts an em dash in code', () => {
    const hits = sourceFiles('src')
      .map((f) => f.split('\\').join('/'))
      .filter((f) => !(f in EXEMPT))
      .flatMap(emDashLines);
    expect(hits).toEqual([]);
  });
});
