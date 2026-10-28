const { spawn } = require('node:child_process');
const { resolve, dirname } = require('node:path');

// En desarrollo el host real lo resuelve la app desde Metro (`api/base-url.ts`):
// `localhost` sólo aporta el puerto. Así, cuando la PC cambia de IP o de WiFi,
// no hay que editar `.env` ni `eas.json`.
const apiUrl = 'http://localhost:3000';
console.log(`[dev] Dashboard: ${apiUrl} (host automático desde Metro)`);

const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', '--dev-client', ...process.argv.slice(2)], {
  cwd: dirname(require.resolve('../package.json')),
  env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: apiUrl },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
