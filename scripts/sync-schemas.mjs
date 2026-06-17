#!/usr/bin/env node
/**
 * Copies the canonical part-type schemas from /schemas (source of truth)
 * into client/src/lib/schemas so SvelteKit can import them at build time.
 *
 * Root `schemas/` is canonical; the client copy is generated. Run this after
 * editing any schema (it is part of `npm run build`).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'schemas');
const dest = join(root, 'client', 'src', 'lib', 'schemas');

mkdirSync(dest, { recursive: true });

// Clear out stale generated files (keep the directory).
for (const f of readdirSync(dest)) {
  if (f.endsWith('.json')) rmSync(join(dest, f));
}

const files = readdirSync(src).filter((f) => f.endsWith('.json'));
let count = 0;
for (const f of files) {
  const raw = readFileSync(join(src, f), 'utf8');
  // Validate JSON before copying so a typo fails the build loudly.
  JSON.parse(raw);
  writeFileSync(join(dest, f), raw);
  count++;
}

console.log(`sync-schemas: copied ${count} schema file(s) -> client/src/lib/schemas`);
