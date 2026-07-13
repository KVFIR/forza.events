#!/usr/bin/env node
/**
 * Push server-only secrets from root `.env` to Supabase Edge Functions.
 * Usage: npm run sync:secrets
 */
import {existsSync, readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = resolve(ROOT, '.env');

const SECRET_KEYS = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_PUBLIC_KEY',
  'DISCORD_BOT_TOKEN',
  'DISCORD_REDIRECT_URI',
  'APP_ORIGIN',
  'ANALYTICS_DASHBOARD_SECRET',
  'ANALYTICS_TRACK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!existsSync(ENV_PATH)) {
  console.error('Missing .env — copy .env.example and fill in values first.');
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_PATH, 'utf8'));
const toSet = SECRET_KEYS.filter((key) => env[key]?.trim());

if (toSet.length === 0) {
  console.error('No server secrets found in .env.');
  process.exit(1);
}

console.log(`Syncing ${toSet.length} secret(s) to Supabase…`);

for (const key of toSet) {
  console.log(`→ ${key}`);
  const result = spawnSync('npx', ['supabase@latest', 'secrets', 'set', `${key}=${env[key]}`], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('Done.');
