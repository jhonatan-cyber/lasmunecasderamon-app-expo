# Plan de implementación — Contraste y accesibilidad

**Fuente:** `CONTRASTE_ACCESIBILIDAD.md`  
**Test automatizado:** `tests/unit/theme/contraste.test.ts`  
**Comando de verificación:** `corepack pnpm vitest run tests/unit/theme/contraste.test.ts`

---

## Objetivo

Cerrar la deuda de contraste identificada en el documento y garantizar que todos los acentos de perfil cumplan WCAG 2.1 AA (4.5:1 texto normal, 3:1 iconos/bordes/controles) tanto en los tokens como en los componentes renderizados.

---

## Cómo usar este plan

- Cada ítem tiene un checkbox `[ ]`. Al completar una tarea, cambia `[ ]` por `[x]` y anota la fecha y evidencia en la columna "Notas".
- Los ítems marcados como **Bloqueante** deben estar resueltos antes de considerar el plan completado.
- El test de contraste valida los tokens y componentes representativos renderizados; la búsqueda de A1 verifica los usos directos restantes.

---

## Ítems de acción

| ID | Tarea | Prioridad | Estado | Notas / Evidencia |
|----|-------|-----------|--------|-------------------|
| A1 | Migrar todos los usos de `accentColor` como texto (importes y etiquetas por props) a `accentOnSurface` | Bloqueante | [x] | 2026-11-24: importes, estados, etiquetas y errores migrados; compactos separan color de icono y texto |
| A2 | Revisar cada resultado de la búsqueda de A1 y confirmar que ya no quede `accentColor` como texto | Bloqueante | [x] | 2026-11-24: búsqueda JSX de texto y estados sin coincidencias; quedan iconos, bordes y fondos |
| A3 | Verificar que `resolveAccentSurface` elige correctamente blanco o casi negro según el contraste en modo claro y oscuro | Alto | [x] | 2026-11-24: test compara ambos extremos para los 13 acentos |
| A4 | Extender cobertura del test de contraste para validar usos reales en componentes (`accentOnSurface` sobre superficies claras/oscuras), no solo tokens | Alto | [x] | 2026-11-24: `MetricBanner`, `HistorySummaryCards` (13 acentos × 2 modos) e `HistoryItemCard` renderizados |
| A5 | Revisar márgenes ajustados: Rojo subtítulo 4.55, Violeta 4.53, Índigo 4.60/4.61, Azul icono claro 3.05, Naranja icono claro 3.00 | Alto | [x] | 2026-11-24: tabla recalculada contra `#1F2937`; mínimo texto oscuro 4.51, icono claro 3.00; todos cumplen |
| A6 | Configurar CI/CD para que `tests/unit/theme/contraste.test.ts` corra en cada PR y bloquee el merge si falla | Medio | [x] | 2026-11-24: paso dedicado en `quality.yml`, sin `|| true` |
| A7 | Evaluar subir a umbral AAA (7:1) el texto crítico en acentos con margen de sobra (Esmeralda, Cian, Ámbar, Dorado, Plata, Negro) | Medio | [x] | 2026-11-24: solo ciertos acentos en oscuro alcanzan 7:1; no se identificó contenido crítico de lectura prolongada para elevar el umbral global |
| A8 | Documentar comportamiento del tema Negro en modo oscuro (acento invertido a `#FFFFFF`, superficies monocroma) en guía de componentes | Bajo | [x] | 2026-11-24: comportamiento descrito en `CONTRASTE_ACCESIBILIDAD.md` |
| A9 | Validar contraste final tras todos los cambios con el test automatizado | Bloqueante | [x] | 2026-11-24: `126/126` pruebas pasan |

---

## Definition of Done (plan completado)

- [x] No queda ningún uso de `accentColor` como texto en componentes.
- [x] El test `contraste.test.ts` pasa en modo claro y oscuro.
- [x] El test corre en CI y bloquea PRs si falla.
- [x] Todos los acentos de la matriz superan 4.5:1 (texto) y 3:1 (iconos/bordes).
- [x] A8 documentado si aplica.

---

## Registro de cambios

| Fecha | ID completado | Qué se hizo | Quién |
|-------|---------------|-------------|-------|
| 2026-11-24 | A1–A9 | Migración de texto, contraste en componentes, CI bloqueante y documentación actualizada; validado con 126 pruebas. | Junie |
| | | | |
