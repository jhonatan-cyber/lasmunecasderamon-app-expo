const { spawn } = require('node:child_process');
const { resolve, dirname } = require('node:path');
const eas = require('../eas.json');

const apiUrl = eas.build.development.env.EXPO_PUBLIC_API_BASE_URL;
console.log(`[dev] API del dashboard: ${apiUrl}`);
const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [cli, 'start', '--dev-client', ...process.argv.slice(2)], {
  cwd: dirname(require.resolve('../package.json')),
  env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: apiUrl },
  stdio: 'inherit',
  windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
