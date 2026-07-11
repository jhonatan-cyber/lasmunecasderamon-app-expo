/**
 * Migrate @expo/vector-icons imports from barrel to tree-shakeable paths.
 *
 * BEFORE:  import { Ionicons } from '@expo/vector-icons'
 * BEFORE:  import { Ionicons } from "@expo/vector-icons"
 *
 * AFTER:   import Ionicons from '@expo/vector-icons/Ionicons'
 * AFTER:   import Ionicons from "@expo/vector-icons/Ionicons"
 *
 * Preserves the original quote style (single/double) and semicolons.
 *
 * Run: node scripts/migrate-vector-icons.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');

// ── Recursive file walk (no external deps) ─────────────────────────────

function walk(dir, extnames, ignoreDirs = ['.', 'node_modules', 'dist', '.expo']) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.some((d) => entry.name.startsWith(d))) {
        results.push(...walk(full, extnames, ignoreDirs));
      }
    } else if (extnames.includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

// ── Regex patterns ────────────────────────────────────────────────────

// Capture group $1 preserves the original quote character (' or ")
const IONICONS_RE =
  /import\s*\{\s*Ionicons\s*\}\s*from\s*(['"])@expo\/vector-icons\1;?\s*$/gm;

// ── Main ──────────────────────────────────────────────────────────────

const projectRoot = join(__dirname, '..');
const files = walk(projectRoot, ['.ts', '.tsx']);

let changed = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const updated = content.replace(IONICONS_RE, (match, quote) => {
    return `import Ionicons from ${quote}@expo/vector-icons/Ionicons${quote};`;
  });

  if (updated !== content) {
    writeFileSync(file, updated, 'utf8');
    console.log(`✅ ${file.replace(projectRoot + '/', '')}`);
    changed++;
  }
}

console.log(`\n🎯 Done! ${changed} files updated.`);
