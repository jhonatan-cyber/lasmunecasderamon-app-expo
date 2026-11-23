import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContainerReturnPanel } from '@/components/barman/bar/ContainerReturnPanel';
import type {
  EnvaseDevolucion,
  EnvaseEscaneo,
} from '@/hooks/useEnvasesScreen';

type TextProps = { children?: ReactNode; numberOfLines?: number };

vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 360, height: 780, scale: 2, fontScale: 1 }) },
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  // numberOfLines se expone como data-lines: es lo que evita que el texto se
  // desborde del card en pantallas de 360 dp.
  Text: ({ children, numberOfLines }: TextProps) => (
    <span data-lines={numberOfLines}>{children}</span>
  ),
  TextInput: () => <input />,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  ),
  RefreshControl: () => null,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    accentText: '#fff',
    accentBg: '#fdecec',
    accentBorder: '#c98a8a',
    accentOnSurface: '#7a2020',
    surfaceMuted: '#f3f3f3',
    bg: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));
vi.mock('@/hooks/useEnvasesScreen', () => ({
  MOTIVO_ENVASE: { ya_devuelto: 'Ya entregado', no_es_nuestro: 'No es nuestro' },
}));
vi.mock('@/components/ui/SkeletonLoader', () => ({
  SkeletonLoader: () => <div data-testid="skeleton" />,
}));
vi.mock('@/components/ui/ErrorState', () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
}));
vi.mock('@/components/shared/VirtualizedList', () => ({
  default: <T,>({
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
  }: {
    data: T[];
    renderItem: (props: { item: T }) => ReactNode;
    keyExtractor: (item: T) => string;
    ListEmptyComponent?: ReactNode;
  }) => (
    <div>
      {data.length
        ? data.map((item) => (
            <div key={keyExtractor(item)}>{renderItem({ item })}</div>
          ))
        : ListEmptyComponent}
    </div>
  ),
}));
afterEach(cleanup);

/** Mismo formato que el panel: dd/mm hh:mm en la zona local del entorno. */
const fechaCorta = (iso: string) => {
  const fecha = new Date(iso);
  return `${fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
  })} ${fecha.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const devolucion = (overrides: Partial<EnvaseDevolucion> = {}): EnvaseDevolucion => ({
  id: 'd1',
  codigo: 'ENV-000000000000123',
  codigo_barras: null,
  estado: 'devuelto',
  ml_merma: 0,
  fecha_devolucion: '2026-11-18T22:47:00.000Z',
  fecha_confirmacion: '2026-11-18T23:05:00.000Z',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  compra_folio: null,
  usuario_nombre: 'María Fernanda',
  usuario_apellido: 'De Los Ángeles Rodríguez',
  usuario_nick: null,
  confirmado_nombre: 'Bartolomé Alejandro',
  confirmado_apellido: 'Fernández De La Fuente',
  confirmado_nick: null,
  pendiente_confirmacion: false,
  ...overrides,
});

const props = {
  codigo: '',
  setCodigo: vi.fn(),
  verificando: false,
  resultado: null,
  sesion: [] as EnvaseEscaneo[],
  entregados: 0,
  rechazados: 0,
  devoluciones: [] as EnvaseDevolucion[],
  loading: false,
  refreshing: false,
  error: null as string | null,
  onEnviar: vi.fn(),
  onLimpiarSesion: vi.fn(),
  onRefresh: vi.fn(),
  onAbrirScanner: vi.fn(),
};

const lineasDe = (texto: string) =>
  screen.getByText(texto, { selector: 'span' }).getAttribute('data-lines');

describe('ContainerReturnPanel', () => {
  it('limita a una línea el producto, el usuario y la fecha largos de cada devolución', () => {
    const item = devolucion();
    render(<ContainerReturnPanel {...props} devoluciones={[item]} />);

    // Encabezado del card.
    expect(lineasDe(item.producto_nombre!)).toBe('1');
    expect(lineasDe(`${item.presentacion_nombre} · SKU ${item.codigo}`)).toBe('1');

    // Pie con nombre completo largo y fecha: ambos se recortan, no desbordan.
    expect(
      lineasDe(
        `${item.usuario_nombre} ${item.usuario_apellido} ${item.usuario_nick ?? ''}`.trim(),
      ),
    ).toBe('1');
    expect(lineasDe(fechaCorta(item.fecha_devolucion!))).toBe('1');

    // Y la línea de "Recibido por" mantiene el nombre y su fecha en una línea.
    const recibido = screen.getByText(
      (_, el) => el?.textContent?.startsWith('Recibido por') ?? false,
      { selector: 'span' },
    );
    expect(recibido.getAttribute('data-lines')).toBe('1');
    expect(recibido.textContent).toContain(
      'Bartolomé Alejandro Fernández De La Fuente',
    );
    expect(recibido.textContent).toContain(fechaCorta(item.fecha_confirmacion!));
  });

  it('la fila de sesión recorta los contadores y deja visible el botón Limpiar', () => {
    render(
      <ContainerReturnPanel
        {...props}
        sesion={[
          {
            id: 'e1',
            codigo: 'ENV-000000000000123',
            ok: true,
            motivo: null,
            mensaje: 'Entregado',
            hora: '22:47:03',
          },
        ]}
        entregados={123456}
        rechazados={7890}
      />,
    );

    const texto = screen
      .getAllByText((_, el) => el?.textContent?.startsWith('Sesión:') ?? false, {
        selector: 'span',
      })
      // El span externo es el que lleva numberOfLines; los internos son los montos.
      .find((el) => el.textContent?.startsWith('Sesión: '));
    expect(texto?.getAttribute('data-lines')).toBe('1');
    expect(texto?.textContent).toContain('123456 entregados');
    expect(texto?.textContent).toContain('7890 rechazados');
    expect(
      screen.getByRole('button', { name: 'Limpiar sesión de escaneos' }),
    ).toBeTruthy();
  });
});
