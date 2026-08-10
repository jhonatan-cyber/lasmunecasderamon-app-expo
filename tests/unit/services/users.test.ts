import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client-safe', () => ({
  apiClientSafe: vi.fn(() => Promise.resolve({ success: true, data: null })),
}));

vi.mock('@/utils/logger', () => ({
  default: { captureException: vi.fn() }
}));

import { apiClientSafe } from '@/api/client-safe';
import { usersService } from '@/services/users';

const mockApi = () => vi.mocked(apiClientSafe);

describe('usersService', () => {
  beforeEach(() => {
    mockApi().mockReset();
  });

  it('list: sin params', () => {
    usersService.list();
    expect(mockApi()).toHaveBeenCalledWith('/users', {});
  });

  it('list: con params y signal', () => {
    const signal = new AbortController().signal;
    usersService.list('page=2', signal);
    expect(mockApi()).toHaveBeenCalledWith('/users?page=2', { signal });
  });

  it('status', () => {
    usersService.status();
    expect(mockApi()).toHaveBeenCalledWith('/users/status', {});
  });

  it('meStats', () => {
    usersService.meStats();
    expect(mockApi()).toHaveBeenCalledWith('/users/me/stats', {});
  });

  it('getProfile', () => {
    usersService.getProfile();
    expect(mockApi()).toHaveBeenCalledWith('/users/profile', {});
  });

  it('updateProfile: envía PUT con id', () => {
    usersService.updateProfile(7, { nick: 'Ana' });
    expect(mockApi()).toHaveBeenCalledWith('/users', {
      method: 'PUT',
      body: JSON.stringify({ id: 7, nick: 'Ana' })
    });
  });

  it('getById', () => {
    usersService.getById(3, new AbortController().signal);
    expect(mockApi()).toHaveBeenCalledWith('/users/3', {
      signal: expect.any(AbortSignal)
    });
  });

  it('generateQR: envía POST con payload', () => {
    usersService.generateQR({ userId: 42 });
    expect(mockApi()).toHaveBeenCalledWith('/users/generate-qr', {
      method: 'POST',
      body: JSON.stringify({ userId: 42 })
    });
  });
});
