import React, { type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModal } from '@/components/ui/AppModal';

const h = vi.hoisted(() => ({
  setModalLayerOpen: vi.fn(),
}));

type RenderProps = { children?: ReactNode };

vi.mock('react-native', () => ({
  Modal: ({ visible, children }: { visible?: boolean; children?: ReactNode }) =>
    visible ? <div data-testid="modal">{children}</div> : null,
  KeyboardAvoidingView: ({ children }: RenderProps) => <div>{children}</div>,
  View: ({ children }: RenderProps) => <div>{children}</div>,
  Platform: { OS: 'ios' },
}));
vi.mock('@/components/ui/NotificationBanner', () => ({
  NotificationBanner: ({ layer }: { layer?: string }) => (
    <div data-testid={`banner-${layer ?? 'root'}`} />
  ),
}));
vi.mock('@/utils/modalLayer', () => ({ setModalLayerOpen: h.setModalLayerOpen }));

beforeEach(() => {
  h.setModalLayerOpen.mockReset();
});
afterEach(() => { cleanup(); });

describe('AppModal: banner de notificaciones dentro de la ventana modal', () => {
  it('muestra el banner dentro del modal abierto', () => {
    render(
      <AppModal visible>
        <div>contenido</div>
      </AppModal>,
    );

    expect(screen.getByTestId('modal')).toBeTruthy();
    expect(screen.getByTestId('banner-modal')).toBeTruthy();
  });

  it('no renderiza nada ni reclama la capa cuando está cerrado', () => {
    render(
      <AppModal visible={false}>
        <div>contenido</div>
      </AppModal>,
    );

    expect(screen.queryByTestId('banner-modal')).toBeNull();
    expect(h.setModalLayerOpen).not.toHaveBeenCalled();
  });

  it('informa a la capa que el modal se abrió y se cerró', () => {
    const { rerender } = render(
      <AppModal visible>
        <div>contenido</div>
      </AppModal>,
    );

    expect(h.setModalLayerOpen).toHaveBeenCalledWith(true);

    act(() => {
      rerender(
        <AppModal visible={false}>
          <div>contenido</div>
        </AppModal>,
      );
    });

    expect(h.setModalLayerOpen).toHaveBeenCalledWith(false);
  });
});
