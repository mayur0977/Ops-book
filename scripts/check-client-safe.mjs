#!/usr/bin/env node
// Fails if a client-safe package gains a server-only import or dependency.
//
// packages/contracts and packages/core are bundled into the mobile app, and
// anything in that bundle is public (root CLAUDE.md rule 4). ESLint already
// carries a no-restricted-imports rule, but a lint rule can be silenced with an
// inline comment. This also checks declared dependencies, which lint cannot see.
//
// See also scripts/check-vertical-leak.sh — same idea, different invariant.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT_SAFE_PACKAGES = ['packages/contracts', 'packages/core'];

const ALLOWED_DEPENDENCIES = new Set(['zod', 'decimal.js', '@daybook/contracts']);

const FORBIDDEN_IMPORT = /\b(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;
const SERVER_ONLY = [
  /^node:/,
  /^(fs|path|crypto|os|child_process|process|http|https|net|tls|worker_threads)$/,
  /^(pg|postgres|drizzle-orm|drizzle-kit|ioredis|redis|argon2|@node-rs\/)/,
  /^(fastify|@fastify\/|pino)/,
  /^dotenv$/,
];

const SERVER_ONLY_GLOBAL = /\bprocess\s*\.\s*env\b/;

const failures = [];

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

for (const pkg of CLIENT_SAFE_PACKAGES) {
  const manifest = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));

  for (const dep of Object.keys(manifest.dependencies ?? {})) {
    if (!ALLOWED_DEPENDENCIES.has(dep)) {
      failures.push(
        `${pkg}/package.json: dependency "${dep}" is not on the client-safe allowlist`,
      );
    }
  }

  for (const file of sourceFiles(join(pkg, 'src'))) {
    const source = readFileSync(file, 'utf8');

    for (const match of source.matchAll(FORBIDDEN_IMPORT)) {
      const specifier = match[1];
      if (SERVER_ONLY.some((p) => p.test(specifier))) {
        failures.push(`${file}: imports server-only module "${specifier}"`);
      }
    }

    if (SERVER_ONLY_GLOBAL.test(source)) {
      failures.push(
        `${file}: reads process.env — secrets must never reach the app bundle`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('\nFAIL: a client-safe package is no longer client-safe.');
  console.error(
    'These packages ship inside the public mobile bundle. See CLAUDE.md rule 4.\n',
  );
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('OK: contracts and core are client-safe.');
