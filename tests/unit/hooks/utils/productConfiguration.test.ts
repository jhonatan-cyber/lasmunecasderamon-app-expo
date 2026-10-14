import { describe, expect, it } from 'vitest';
import { requiresShortMixer, bottleMixerUnits, shortMixerConsumption } from '@/hooks/utils/productConfiguration';
import { saleInventoryFields } from '@/hooks/utils/saleInventoryFields';
import { resolverVentaProducto } from '@/hooks/utils/saleChoice';
const product = { tipo_venta: 'shot', opciones_venta: [{ tipo: 'shot', precio: 5000, comision: 0, precio_anfitriona: 8000, ml_acompanamiento_cliente: 330, ml_acompanamiento_anfitriona: 150 }] };
describe('configured product consumption', () => {
 it('uses whole accompanying products for either short audience', () => {
  expect(requiresShortMixer(product)).toBe(true);
  expect(requiresShortMixer({...product, shot_anfitriona:true})).toBe(true);
 });
 it('selects full products regardless of historical mixer ml settings', () => {
  expect(requiresShortMixer({...product, opciones_venta: [{tipo: 'shot', ml_acompanamiento_cliente: 0}]})).toBe(true);
  expect(requiresShortMixer({tipo_venta:'shot'})).toBe(true);
 });
 it('consumes a complete client mixer and configured hostess ml', () => {
  expect(shortMixerConsumption(product)).toEqual({unidades:1});
  expect(shortMixerConsumption({...product,shot_anfitriona:true})).toEqual({ml_por_corto:150});
  expect(requiresShortMixer({...product,shot_anfitriona:true,opciones_venta:[{tipo:'shot',ml_acompanamiento_anfitriona:0}]})).toBe(false);
 });
 it('only offers enabled formats', () => {
  expect(resolverVentaProducto(product).opciones.some(option => option.value === 'botella')).toBe(false);
  expect(resolverVentaProducto(product).tipoVenta).toBe('shot');
 });
 it('preserves bottle accompaniment through stored orders and accounts', () => {
  const mixer = {presentacion_id:'sprite', unidades:4};
  expect(saleInventoryFields({configuracion_venta: JSON.stringify({presentacion_id:'vodka', tipo_venta:'botella', acompanamiento_botella:mixer})}).acompanamiento_botella).toEqual(mixer);
  expect(bottleMixerUnits({opciones_venta:[{tipo:'botella',acompanamiento:{unidades:4}}]})).toBe(4);
 });
});
