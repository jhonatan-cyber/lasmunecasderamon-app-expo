import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  esRutaPantallaAsistencia,
  useModoPantallaStore,
} from '@/store/modoPantallaStore';

const reiniciar = () =>
  useModoPantallaStore.setState({ activo: false, nombre: null, cargado: false });

describe('modoPantallaStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reiniciar();
  });

  it('activa y persiste el modo pantalla con el nombre del dispositivo', async () => {
    await useModoPantallaStore.getState().activar('Entrada del local');

    expect(useModoPantallaStore.getState().activo).toBe(true);
    expect(useModoPantallaStore.getState().nombre).toBe('Entrada del local');
  });

  it('restaura el modo pantalla desde el almacenamiento al cargar', async () => {
    await useModoPantallaStore.getState().activar('Barra');
    reiniciar();

    await useModoPantallaStore.getState().cargar();

    expect(useModoPantallaStore.getState().activo).toBe(true);
    expect(useModoPantallaStore.getState().nombre).toBe('Barra');
    expect(useModoPantallaStore.getState().cargado).toBe(true);
  });

  it('desactivar limpia el estado y el almacenamiento', async () => {
    await useModoPantallaStore.getState().activar('Barra');
    await useModoPantallaStore.getState().desactivar();

    expect(useModoPantallaStore.getState().activo).toBe(false);
    expect(useModoPantallaStore.getState().nombre).toBeNull();

    reiniciar();
    await useModoPantallaStore.getState().cargar();
    expect(useModoPantallaStore.getState().activo).toBe(false);
  });

  it('ignora un valor persistido corrupto sin romper el arranque', async () => {
    await AsyncStorage.setItem('modoPantallaAsistencia', 'no-es-json');

    await useModoPantallaStore.getState().cargar();

    expect(useModoPantallaStore.getState().activo).toBe(false);
    expect(useModoPantallaStore.getState().cargado).toBe(true);
  });

  it('reconoce la ruta de la vista de asistencia', () => {
    expect(esRutaPantallaAsistencia(['(app)', 'cajero', 'pantalla-asistencia'])).toBe(true);
    expect(esRutaPantallaAsistencia(['(app)', 'cajero', '(tabs)'])).toBe(false);
    expect(esRutaPantallaAsistencia([])).toBe(false);
  });
});
