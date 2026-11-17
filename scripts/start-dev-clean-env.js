const { spawn } = require('node:child_process');
const { resolve, dirname } = require('node:path');

// Elimina CI y NO_COLOR del entorno para habilitar fast refresh y colores.
const cleanEnv = { ...process.env };
delete cleanEnv.CI;
delete cleanEnv.NO_COLOR;

// metro.config.js sirve el polyfill de expo-sqlite solo con esta marca; sin
// ella (dev client) se resuelve el módulo nativo real.
const args = process.argv.slice(2);
if (args.includes('--go')) cleanEnv.EXPO_GO = '1';
else delete cleanEnv.EXPO_GO;

const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', ...args], {
  cwd: dirname(require.resolve('../package.json')),
  env: cleanEnv,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
