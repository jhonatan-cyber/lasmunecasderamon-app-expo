import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
const mocks = vi.hoisted(() => ({ permission: vi.fn(), picker: vi.fn(), api: vi.fn(), update: vi.fn(), platform: { OS: 'android' }, user: { id: 'u1', nick: 'Test' } }));
vi.mock('expo-router', () => ({ useFocusEffect: (callback: any) => { useEffect(callback, [callback]); } }));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('@/api/client', () => ({ apiClientSafe: mocks.api }));
vi.mock('@/store/authStore', () => ({ useAuthStore: (select: any) => select({ user: mocks.user, updateProfile: mocks.update }) }));
vi.mock('@/utils/eventBus', () => ({ eventBus: { addListener: () => ({ remove: vi.fn() }) } }));
vi.mock('@/utils/logger', () => ({ default: { fetchError: vi.fn() } }));
vi.mock('expo-file-system', () => ({ File: class extends Blob { name = 'photo.jpg'; constructor(_uri: string) { super(['image'], { type: 'image/jpeg' }); } } }));
vi.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: mocks.permission, launchImageLibraryAsync: mocks.picker }));

describe('foto del perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platform.OS = 'android';
    mocks.permission.mockResolvedValue({ status: 'granted' });
    mocks.picker.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///selected.jpg' }] });
    mocks.api.mockResolvedValue({ success: true, data: { foto: 'saved.jpg' } });
  });
  it('envia un archivo binario y actualiza la foto guardada', async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateField('image', 'file:///photo.jpg'));
    let response: any;
    await act(async () => { response = await result.current.saveProfile(); });
    const upload = mocks.api.mock.calls.find(([path]) => path === '/users');
    const image = upload?.[1].body.get('foto');
    expect(image).toBeInstanceOf(Blob);
    expect(image.type).toBe('image/jpeg');
    expect(image.size).toBeGreaterThan(0);
    expect(response.success).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ foto: 'saved.jpg' }), { localOnly: true });
    expect(result.current.formData.image).toBeNull();
  });
  it('abre la galeria y conserva la imagen seleccionada', async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.pickImage(); });
    expect(result.current.formData.image).toBe('file:///selected.jpg');
    expect(mocks.picker).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'] }));
  });
  it('controla un fallo de permisos sin rechazar la promesa', async () => {
    mocks.permission.mockRejectedValue(new Error('native failure'));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await expect(result.current.pickImage()).resolves.toEqual({ success: false, message: expect.stringContaining('galería') });
  });

  it('no confirma el guardado si el servidor conserva otra foto', async () => {
    mocks.api.mockImplementation(async (path: string) => ({ success: true, data: { foto: path === '/users' ? 'new.jpg' : 'old.jpg' } }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateField('image', 'file:///photo.jpg'));
    let response: any;
    await act(async () => { response = await result.current.saveProfile(); });
    expect(response.success).toBe(false);
    expect(response.message).toContain('confirmar');
    expect(result.current.formData.image).toBe('file:///photo.jpg');
  });

});
