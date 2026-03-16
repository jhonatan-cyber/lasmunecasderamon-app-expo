import { create } from 'zustand';

interface AsistenciaModalState {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

export const useAsistenciaModalStore = create<AsistenciaModalState>((set) => ({
    isOpen: false,
    openModal: () => set({ isOpen: true }),
    closeModal: () => set({ isOpen: false }),
}));
