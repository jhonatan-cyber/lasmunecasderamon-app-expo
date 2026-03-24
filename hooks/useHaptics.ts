import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface HapticsState {
    enabled: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
    loadSettings: () => Promise<void>;
}

export const useHapticsStore = create<HapticsState>((set) => ({
    enabled: true,

    setEnabled: async (enabled) => {
        set({ enabled });
        await AsyncStorage.setItem('haptics-enabled', enabled.toString());
    },

    loadSettings: async () => {
        const enabled = await AsyncStorage.getItem('haptics-enabled');
        set({ enabled: enabled !== 'false' });
    },
}));

export const useHaptics = () => {
    const { enabled, setEnabled, loadSettings } = useHapticsStore();

    const light = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
    }, [enabled]);

    const medium = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
    }, [enabled]);

    const heavy = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (e) {}
    }, [enabled]);

    const success = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
    }, [enabled]);

    const warning = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (e) {}
    }, [enabled]);

    const error = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {}
    }, [enabled]);

    const selection = useCallback(async () => {
        if (!enabled) return;
        try {
            await Haptics.selectionAsync();
        } catch (e) {}
    }, [enabled]);

    const trigger = useCallback(async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light') => {
        switch (type) {
            case 'light': await light(); break;
            case 'medium': await medium(); break;
            case 'heavy': await heavy(); break;
            case 'success': await success(); break;
            case 'warning': await warning(); break;
            case 'error': await error(); break;
            case 'selection': await selection(); break;
        }
    }, [light, medium, heavy, success, warning, error, selection]);

    return {
        enabled,
        setEnabled,
        loadSettings,
        light,
        medium,
        heavy,
        success,
        warning,
        error,
        selection,
        trigger,
    };
};

export const hapticTypes = {
    buttonPress: 'light',
    successAction: 'success',
    errorAction: 'error',
    selection: 'selection',
    warning: 'warning',
} as const;
