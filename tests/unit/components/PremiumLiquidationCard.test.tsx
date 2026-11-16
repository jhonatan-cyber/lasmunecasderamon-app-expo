import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PremiumLiquidationCard } from '@/components/shared/PremiumLiquidationCard';

const native = vi.hoisted(() => ({
  platform: { OS: 'android', Version: 35 },
  requestPermission: vi.fn(),
  printToFile: vi.fn(),
  print: vi.fn(),
  createFile: vi.fn(),
  copyFile: vi.fn(),
  deleteFile: vi.fn(),
  captureException: vi.fn(),
  chooseDirectory: vi.fn(),
  share: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: native.platform,
  PermissionsAndroid: {
    PERMISSIONS: { WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE' },
    RESULTS: { GRANTED: 'granted' },
    request: native.requestPermission,
  },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  StyleSheet: { create: (styles: any) => styles },
  Pressable: ({ children, onPress, accessibilityLabel, disabled }: any) => (
    <button onClick={onPress} aria-label={accessibilityLabel} disabled={disabled}>
      {children}
    </button>
  ),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ accentColor: '#E11D48', cardBg: '#111', borderColor: '#333', textSecondary: '#aaa' }),
}));
vi.mock('expo-print', () => ({ printToFileAsync: native.printToFile, printAsync: native.print }));
vi.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: { requestDirectoryPermissionsAsync: native.chooseDirectory },
}));
vi.mock('expo-sharing', () => ({ shareAsync: native.share, isAvailableAsync: async () => true }));
vi.mock('react-native-blob-util', () => ({
  default: { media: { createFile: native.createFile }, fs: { cp: native.copyFile, unlink: native.deleteFile } },
}));
vi.mock('@/utils/logger', () => ({ default: { captureException: native.captureException } }));
vi.mock('@/components/ui/PremiumAlert', () => ({
  PremiumAlert: ({ visible, title, message }: any) => visible ? <div role="alert">{title} {message}</div> : null,
}));

const props = {
  user: { name: 'Persona', nick: 'prueba' },
  events: [{ id: 1, codigo: 'P-1', type: 'propina', date: '2026-11-13T10:00:00', amount: 5000, estado: 1 }],
  totalAmount: 5000,
};
const exportButton = () => screen.getByRole('button', { name: 'Exportar reporte a PDF' });

beforeEach(() => {
  vi.clearAllMocks();
  native.platform.OS = 'android';
  native.platform.Version = 35;
  native.requestPermission.mockResolvedValue('granted');
  native.printToFile.mockResolvedValue({ uri: 'file:///cache/reporte.pdf', numberOfPages: 1 });
  native.createFile.mockResolvedValue('content://media/external/downloads/42');
  native.copyFile.mockResolvedValue(undefined);
  native.deleteFile.mockResolvedValue(undefined);
  native.chooseDirectory.mockResolvedValue({ granted: false });
});

describe('descarga automática del reporte en Android', () => {
  it('guarda el PDF en Descargas sin selector ni menú de compartir', async () => {
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(native.copyFile).toHaveBeenCalledWith(
      'file:///cache/reporte.pdf', 'content://media/external/downloads/42',
    ));
    expect(native.createFile).toHaveBeenCalledWith({
      name: expect.stringMatching(/^reporte_\d+\.pdf$/),
      parentFolder: '',
      mimeType: 'application/pdf',
    }, 'Download');
    expect(native.chooseDirectory).not.toHaveBeenCalled();
    expect(native.requestPermission).not.toHaveBeenCalled();
    expect(native.share).not.toHaveBeenCalled();
    expect(native.print).not.toHaveBeenCalled();
    expect(native.deleteFile).not.toHaveBeenCalled();
    expect(onExportSuccess).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert').textContent).toContain('Descargas');
  });

  it('elimina solo el PDF incompleto y no anuncia éxito si falla el guardado', async () => {
    native.copyFile.mockRejectedValueOnce(new Error('Sin espacio'));
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no se pudo/i));
    expect(native.deleteFile).toHaveBeenCalledExactlyOnceWith('content://media/external/downloads/42');
    expect(onExportSuccess).not.toHaveBeenCalled();
    expect(exportButton().hasAttribute('disabled')).toBe(false);
  });

  it('conserva el error de copia y permite reintentar si también falla la limpieza', async () => {
    const copyError = new Error('Sin espacio');
    const cleanupError = new Error('No se pudo eliminar');
    native.copyFile.mockRejectedValueOnce(copyError);
    native.deleteFile.mockRejectedValueOnce(cleanupError);
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no se pudo/i));
    expect(native.captureException).toHaveBeenCalledWith(cleanupError, expect.any(Object));
    expect(native.captureException).toHaveBeenCalledWith(copyError, expect.any(Object));
    expect(onExportSuccess).not.toHaveBeenCalled();
    expect(exportButton().hasAttribute('disabled')).toBe(false);
  });

  it('bloquea pulsaciones repetidas mientras guarda y espera antes de avisar', async () => {
    let finishCopy!: () => void;
    native.copyFile.mockImplementationOnce(() => new Promise<void>((resolve) => { finishCopy = resolve; }));
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());
    await waitFor(() => expect(native.copyFile).toHaveBeenCalledOnce());
    fireEvent.click(exportButton());

    expect(exportButton().hasAttribute('disabled')).toBe(true);
    expect(native.printToFile).toHaveBeenCalledOnce();
    expect(onExportSuccess).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    finishCopy();
    await waitFor(() => expect(onExportSuccess).toHaveBeenCalledOnce());
    expect(exportButton().hasAttribute('disabled')).toBe(false);
  });

  it('pide permiso de almacenamiento en Android antiguo, sin elegir carpeta', async () => {
    native.platform.Version = 28;
    render(<PremiumLiquidationCard {...props} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(native.copyFile).toHaveBeenCalledOnce());
    expect(native.requestPermission).toHaveBeenCalledWith('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(native.chooseDirectory).not.toHaveBeenCalled();
  });

  it('no genera ni guarda archivos si se rechaza el permiso en Android antiguo', async () => {
    native.platform.Version = 28;
    native.requestPermission.mockResolvedValueOnce('denied');
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/permiso/i));
    expect(native.printToFile).not.toHaveBeenCalled();
    expect(native.createFile).not.toHaveBeenCalled();
    expect(onExportSuccess).not.toHaveBeenCalled();
  });

  it('mantiene el flujo de iOS sin usar la descarga nativa de Android', async () => {
    native.platform.OS = 'ios';
    const onExportSuccess = vi.fn();
    render(<PremiumLiquidationCard {...props} onExportSuccess={onExportSuccess} />);
    fireEvent.click(exportButton());

    await waitFor(() => expect(onExportSuccess).toHaveBeenCalledOnce());
    expect(native.print).toHaveBeenCalledOnce();
    expect(native.createFile).not.toHaveBeenCalled();
  });
});
