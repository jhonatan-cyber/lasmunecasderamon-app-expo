import { cleanup, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GarzonHomeActions } from '@/components/screens/home/GarzonHomeActions';

vi.mock('@/components/ui/ActionGrid', () => ({
  ActionGrid: ({ actions }: { actions: { title: string; badge?: number }[] }) => (
    <div>
      {actions.map((action) => (
        <div key={action.title} data-title={action.title} data-badge={action.badge}>
          {action.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/utils/cajaGate', () => ({ rutaExigeCajaAbierta: () => false }));

afterEach(() => {
  cleanup();
});

describe('inicio del garzón', () => {
  it('no ofrece la tarjeta de covers', () => {
    render(
      <GarzonHomeActions
        bloqueado={false}
        accentColor="#E11D48"
        onOpenPedidos={vi.fn()}
        onOpenServicios={vi.fn()}
        onOpenEntradas={vi.fn()}
        onOpenResumen={vi.fn()}
      />,
    );

    ['PEDIDOS', 'SERVICIOS', 'ENTRADAS', 'RESUMEN'].forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeDefined();
    });
    expect(screen.queryByText('COVERS')).toBeNull();
  });

  it('no deja una ruta de covers que resuelva un deep link', () => {
    // Quien sirve y entrega covers es el barman; sin archivo de ruta,
    // expo-router manda /garzon/covers a +not-found.
    expect(existsSync(path.join(process.cwd(), 'app', '(app)', 'garzon', 'covers.tsx'))).toBe(
      false,
    );
  });

  it('muestra el contador de pedidos por entregar en PEDIDOS', () => {
    render(
      <GarzonHomeActions
        bloqueado={false}
        accentColor="#E11D48"
        pendingOrders={4}
        onOpenPedidos={vi.fn()}
        onOpenServicios={vi.fn()}
        onOpenEntradas={vi.fn()}
        onOpenResumen={vi.fn()}
      />,
    );

    const pedidos = screen.getByText('PEDIDOS').closest('[data-title="PEDIDOS"]');

    expect(pedidos?.getAttribute('data-badge')).toBe('4');
  });
});
