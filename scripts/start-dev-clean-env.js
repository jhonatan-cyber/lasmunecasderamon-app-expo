const { spawn } = require('node:child_process');
const { resolve, dirname } = require('node:path');

// Elimina CI y NO_COLOR del entorno para habilitar fast refresh y colores.
const cleanEnv = { ...process.env };
delete cleanEnv.CI;
delete cleanEnv.NO_COLOR;

const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', ...process.argv.slice(2)], {
  cwd: dirname(require.resolve('../package.json')),
  env: cleanEnv,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
