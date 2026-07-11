/**
 * analyze-bundle.js
 *
 * Reads the Metro-generated source map (.js.map) from the last production
 * build and prints a size breakdown by dependency / source directory.
 *
 * Usage:
 *   node ./scripts/analyze-bundle.js
 *
 * Requires:
 *   A recent `expo export --platform web --dump-sourcemap` build in dist/
 */
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const WEB_JS = path.join(DIST, '_expo', 'static', 'js', 'web');

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  // ── 1. Find the entry .js.map file ────────────────────────────────
  const files = fs.readdirSync(WEB_JS);
  const mapFile = files.find(
    (f) => f.startsWith('entry') && f.endsWith('.js.map'),
  );
  if (!mapFile) {
    console.error(
      '❌ No entry source map found. Run the build first:\n' +
        '   expo export --platform web --dump-sourcemap',
    );
    process.exit(1);
  }

  const mapPath = path.join(WEB_JS, mapFile);
  const jsPath = mapPath.replace(/\.map$/, '');
  const jsSize = fs.statSync(jsPath).size;
  const raw = fs.readFileSync(mapPath, 'utf8');
  const map = JSON.parse(raw);

  // ── 2. Warn if sourcesContent is missing ──────────────────────────
  if (!map.sourcesContent) {
    console.error(
      '❌ Source map has no sourcesContent. Ensure the build ran with' +
        ' `--dump-sourcemap`.',
    );
    process.exit(1);
  }

  // ── 3. Aggregate by top-level directory ───────────────────────────
  const groups = new Map(); // groupName → { bytes, files }

  for (let i = 0; i < map.sources.length; i++) {
    const src = map.sources[i] || '';
    const content = map.sourcesContent[i];
    if (!content) continue;

    const bytes = Buffer.byteLength(content, 'utf8');

    // Normalise path separators to forward slash
    const normalised = src.replace(/\\/g, '/');

    // Determine group
    let group;
    if (normalised.startsWith('node_modules/')) {
      // node_modules/<package>/...
      const parts = normalised.split('/');
      group = 'node_modules/' + (parts[1] || '?');
      if (parts[1] && parts[1].startsWith('@')) {
        group += '/' + (parts[2] || '?');
      }
    } else if (normalised.startsWith('packages/')) {
      group = normalised.split('/').slice(0, 2).join('/');
    } else if (normalised.startsWith('app/')) {
      group = 'app/ (código propio)';
    } else {
      group = 'otros';
    }

    if (!groups.has(group)) {
      groups.set(group, { bytes: 0, files: 0 });
    }
    const g = groups.get(group);
    g.bytes += bytes;
    g.files += 1;
  }

  const totalBytes = [...groups.values()].reduce((s, g) => s + g.bytes, 0);

  // ── 4. Print report ───────────────────────────────────────────────
  const bar = (pct) => {
    const w = 30;
    const filled = Math.round((pct / 100) * w);
    return '█'.repeat(filled) + '░'.repeat(w - filled);
  };

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  📊  Bundle Analysis Report');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Bundle (JS):       ${(jsSize / 1024).toFixed(1)} KB`);
  console.log(`  Source map:        ${(mapPath.length > 0 ? fs.statSync(mapPath).size / 1024 / 1024 : 0).toFixed(1)} MB`);
  console.log(`  Mapped sources:    ${map.sourcesContent.filter(Boolean).length} files`);
  console.log(`  Total source (raw): ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log('');

  const sorted = [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes);

  console.log(`  ${'Category'.padEnd(45)} ${'Size'.padStart(8)} ${'%'.padStart(6)} ${'Files'.padStart(6)}  Contribution`);
  console.log(`  ${'─'.repeat(44)} ──────── ────── ──────  ──────────────────────────────`);

  sorted.forEach(([name, data]) => {
    const pct = (data.bytes / totalBytes) * 100;
    console.log(
      `  ${name.padEnd(44)} ` +
        `${(data.bytes / 1024).toFixed(1).padStart(7)} KB ` +
        `${pct.toFixed(1).padStart(5)}% ` +
        `${String(data.files).padStart(5)}  ${bar(pct)}`,
    );
  });

  console.log('');
  console.log(`  ${'TOTAL'.padEnd(44)} ${(totalBytes / 1024).toFixed(1).padStart(7)} KB`);
  console.log('');

  // ── 5. Top 20 individual files ────────────────────────────────────
  const fileSizes = [];
  for (let i = 0; i < map.sources.length; i++) {
    const content = map.sourcesContent[i];
    if (!content) continue;
    const src = map.sources[i].replace(/\\/g, '/');
    const bytes = Buffer.byteLength(content, 'utf8');
    fileSizes.push({ src, bytes });
  }
  fileSizes.sort((a, b) => b.bytes - a.bytes);

  console.log('  ─── Top 20 largest source files ───');
  console.log('');
  fileSizes.slice(0, 20).forEach((f, i) => {
    const pct = (f.bytes / totalBytes) * 100;
    const short = f.src.length > 70 ? '…' + f.src.slice(-69) : f.src;
    console.log(
      `  ${String(i + 1).padStart(2)}. ${(f.bytes / 1024).toFixed(1).padStart(7)} KB` +
        ` (${pct.toFixed(1)}%)  ${short}`,
    );
  });

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Report generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');

  // ── 6. Save report as JSON for CI / downstream tooling ────────────
  const report = {
    generatedAt: new Date().toISOString(),
    bundleSize: jsSize,
    sourceMapSize: fs.statSync(mapPath).size,
    totalMappedSources: map.sourcesContent.filter(Boolean).length,
    totalSourceBytes: totalBytes,
    breakdown: sorted.map(([name, data]) => ({
      name,
      bytes: data.bytes,
      files: data.files,
      percent: Number(((data.bytes / totalBytes) * 100).toFixed(1)),
    })),
    topFiles: fileSizes.slice(0, 50).map((f) => ({
      source: f.src,
      bytes: f.bytes,
      percent: Number(((f.bytes / totalBytes) * 100).toFixed(1)),
    })),
  };

  const reportPath = path.join(DIST, 'bundle-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`  💾  JSON report saved → ${path.relative(process.cwd(), reportPath)}`);
  console.log('');
}
