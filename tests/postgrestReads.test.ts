import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const TABLE_FROM = /\.from\(\s*['"](events|event_results|rating_ledger|cars|event_participants)['"]/;

function walk(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : [];
  });
}

describe('PostgREST table reads', () => {
  it('live behind canUsePostgrestReads (forza.events REST 401s)', () => {
    const unguarded = walk(SRC_ROOT).filter((file) => {
      const src = readFileSync(file, 'utf8');
      return TABLE_FROM.test(src) && !src.includes('canUsePostgrestReads');
    });
    expect(unguarded.map((file) => path.relative(SRC_ROOT, file))).toEqual([]);
  });
});
