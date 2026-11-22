#!/usr/bin/env node
/**
 * Verifica que los relojes de la app calculen el tiempo con un instante
 * explícito (`now`) en vez de depender de `Date.now()` escondido en un helper.
 *
 * ¿Por qué? `app.json` tiene `experiments.reactCompiler: true`. React Compiler
 * cachea el resultado de las llamadas a funciones importadas usando sus
 * argumentos como clave. Si el tiempo se calcula con argumentos que no cambian
 * (por ejemplo `tiempoServicio(item, serverOffset)`), el componente re-renderiza
 * cada segundo pero el valor queda congelado. Eso fue exactamente el bug de
 * ServiceCard, ServiceDetailModal y TimerPill.
 *
 * Vitest NO ejecuta React Compiler, así que ningún test de render detecta esta
 * regresión: la única comprobación fiable es compilar con el plugin y revisar
 * que el reloj entre en la clave de caché.
 *
 * Uso:
 *   node scripts/verify-compiler-clocks.js           # revisa el registro de abajo
 *   node scripts/verify-compiler-clocks.js archivo:helper ...  # casos puntuales
 */

const path = require('path');
const babel = require('@babel/core');

const RAIZ = path.resolve(path.dirname(require.main.filename), '..');
const ARG_RELOJ = 'now';

/** Componentes con cuenta regresiva: archivo + helper que calcula el tiempo. */
const RELOJES = [
  { archivo: 'components/cajero/servicios/ServiceCard.tsx', helper: 'tiempoServicio' },
  { archivo: 'components/cajero/servicios/ServiceDetailModal.tsx', helper: 'tiempoServicio' },
  { archivo: 'components/cajero/ventas/TimerPill.tsx', helper: 'calculateRemainingTime' },
];

function compilar(archivo) {
  return babel.transformFileSync(archivo, {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [['babel-plugin-react-compiler']],
    filename: archivo,
    babelrc: false,
    configFile: false,
    envName: 'production',
  }).code;
}

/** Texto de los argumentos de la llamada que empieza en `desde` (tras el `(`). */
function argumentosDeLaLlamada(codigo, desde) {
  let nivel = 0;
  let i = desde;
  for (; i < codigo.length; i++) {
    const c = codigo[i];
    if (c === '(' || c === '[' || c === '{') nivel++;
    else if (c === ')' || c === ']' || c === '}') {
      if (nivel === 0) break;
      nivel--;
    }
  }
  return codigo.slice(desde, i);
}

/**
 * Condición de caché que envuelve la llamada: la última `if($[` antes de ella.
 * Devuelve null si la llamada quedó fuera de cualquier bloque cacheado.
 */
function condicionDeCache(codigo, posicionLlamada) {
  const corte = codigo.lastIndexOf('if($[', posicionLlamada);
  if (corte === -1) return null;
  return codigo.slice(corte, posicionLlamada);
}

function revisar({ archivo, helper }) {
  const ruta = path.isAbsolute(archivo) ? archivo : path.join(RAIZ, archivo);
  const nombre = path.relative(RAIZ, ruta);
  const fallos = [];

  const fuente = require('fs').readFileSync(ruta, 'utf8');
  if (!fuente.includes('setInterval')) {
    fallos.push('no tiene `setInterval`: si dejó de ser un reloj, quitálo del registro');
  }

  let codigo;
  try {
    codigo = compilar(ruta);
  } catch (error) {
    return { nombre, fallos: [`no compila con React Compiler: ${error.message}`] };
  }

  const aguja = `${helper})(`;
  let desde = 0;
  let llamadas = 0;

  for (;;) {
    const posicion = codigo.indexOf(aguja, desde);
    if (posicion === -1) break;
    llamadas++;
    desde = posicion + aguja.length;

    const argumentos = argumentosDeLaLlamada(codigo, desde);
    const pasaElReloj = new RegExp(`(^|,)\\s*${ARG_RELOJ}\\s*$`).test(argumentos.trim());
    if (!pasaElReloj) {
      fallos.push(
        `la llamada ${helper}(${argumentos.replace(/\s+/g, ' ')}) no recibe \`${ARG_RELOJ}\` ` +
          'como último argumento: React Compiler va a cachear el tiempo y el reloj se congela',
      );
      continue;
    }

    const condicion = condicionDeCache(codigo, posicion);
    if (condicion === null) {
      fallos.push(
        `la llamada a ${helper} quedó fuera del bloque cacheado; no se puede comprobar que ` +
          `\`${ARG_RELOJ}\` invalide la caché (revisá el componente a mano)`,
      );
      continue;
    }
    if (!new RegExp(`!==\\s*${ARG_RELOJ}\\b`).test(condicion)) {
      fallos.push(
        `la clave de caché que envuelve ${helper}(...) no incluye \`${ARG_RELOJ}\`: ` +
          'se recalcularía solo cuando cambien los demás argumentos',
      );
    }
  }

  if (llamadas === 0) {
    fallos.push(`no se encontró ninguna llamada a ${helper} en el bundle compilado`);
  }

  return { nombre, fallos };
}

function leerCasos() {
  const casos = process.argv.slice(2);
  if (casos.length === 0) return RELOJES;
  return casos.map((caso) => {
    const [archivo, helper] = caso.split(':');
    if (!archivo || !helper) {
      console.error(`Caso inválido "${caso}". Formato esperado: archivo:helper`);
      process.exit(2);
    }
    return { archivo, helper };
  });
}

const resultados = leerCasos().map(revisar);
const conFallos = resultados.filter((r) => r.fallos.length > 0);

for (const { nombre, fallos } of resultados) {
  if (fallos.length === 0) {
    console.log(`ok   ${nombre}`);
    continue;
  }
  console.error(`FALLA ${nombre}`);
  for (const fallo of fallos) console.error(`      - ${fallo}`);
}

if (conFallos.length > 0) {
  console.error(
    `\n${conFallos.length} reloj(es) con problemas. El tiempo debe entrar como argumento ` +
      `(\`${ARG_RELOJ}\`) para que React Compiler no lo cachee.`,
  );
  process.exit(1);
}

console.log(`\n${resultados.length} reloj(es) verificados.`);
