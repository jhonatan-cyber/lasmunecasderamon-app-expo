import { describe, it, expect, beforeEach } from 'vitest';
import { useAsistenciaModalStore } from '@/store/asistenciaModalStore';

describe('asistenciaModalStore', () => {
    beforeEach(() => {
        useAsistenciaModalStore.setState({ isOpen: false });
    });

    it('debe iniciar con modal cerrado', () => {
        expect(useAsistenciaModalStore.getState().isOpen).toBe(false);
    });

    it('openModal debe abrir el modal', () => {
        useAsistenciaModalStore.getState().openModal();
        expect(useAsistenciaModalStore.getState().isOpen).toBe(true);
    });

    it('closeModal debe cerrar el modal', () => {
        useAsistenciaModalStore.getState().openModal();
        useAsistenciaModalStore.getState().closeModal();
        expect(useAsistenciaModalStore.getState().isOpen).toBe(false);
    });

    it('closeModal en modal ya cerrado no debe cambiar estado', () => {
        useAsistenciaModalStore.getState().closeModal();
        expect(useAsistenciaModalStore.getState().isOpen).toBe(false);
    });

    it('openModal múltiples veces debe mantenerlo abierto', () => {
        useAsistenciaModalStore.getState().openModal();
        useAsistenciaModalStore.getState().openModal();
        useAsistenciaModalStore.getState().openModal();
        expect(useAsistenciaModalStore.getState().isOpen).toBe(true);
    });
});
