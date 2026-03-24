import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

interface Shortcut {
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
    action: () => Promise<void>;
}

export const appShortcuts: Shortcut[] = [
    {
        id: 'open_sales',
        title: 'Abrir Ventas',
        subtitle: 'Ver ventas del día',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://cajero/ventas');
        },
    },
    {
        id: 'open_services',
        title: 'Ver Servicios',
        subtitle: 'Servicios activos',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://anfitriona/servicios');
        },
    },
    {
        id: 'open_caja',
        title: 'Abrir Caja',
        subtitle: 'Gestionar caja',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://cajero/caja');
        },
    },
    {
        id: 'register_attendance',
        title: 'Registrar Asistencia',
        subtitle: 'Marcar entrada/salida',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://asistencia');
        },
    },
    {
        id: 'view_commissions',
        title: 'Mis Comisiones',
        subtitle: 'Ver ganancias',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://anfitriona/comisiones');
        },
    },
    {
        id: 'view_tips',
        title: 'Mis Propinas',
        subtitle: 'Ver propinas del día',
        action: async () => {
            await Linking.openURL('lasmunecasderamon://garzon/propinas');
        },
    },
];

export const getShortcutFromIntent = async (): Promise<string | null> => {
    if (Platform.OS !== 'android') return null;
    
    try {
        // Obsolete: getPendingIntent no longer exists in expo-intent-launcher
        // const intent = await IntentLauncher.getPendingIntent();
        // if (intent?.data) {
        //     const action = intent.data.extra?.shortcutId;
        //     return action || null;
        // }
    } catch (error) {
        console.log('No pending intent or method not found');
    }
    
    return null;
};

export const executeShortcut = async (shortcutId: string): Promise<void> => {
    const shortcut = appShortcuts.find(s => s.id === shortcutId);
    if (shortcut) {
        await shortcut.action();
    }
};

export const createAndroidShortcut = async (shortcutId: string): Promise<void> => {
    if (Platform.OS !== 'android') return;
    
   
};

export const setupSiriShortcuts = async (): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    
   
};

export const addSiriShortcut = async (
    phrase: string,
    shortcutId: string,
): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    
   
    return true;
};

export const invokeSiri = async (phrase: string): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    
    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(phrase)}`;
    await Linking.openURL(url);
};

export const triggerShortcut = async (shortcutId: string): Promise<boolean> => {
    try {
        await executeShortcut(shortcutId);
        return true;
    } catch (error) {
       
        return false;
    }
};

export const getAllShortcuts = (): Shortcut[] => {
    return appShortcuts;
};

export const getShortcutById = (id: string): Shortcut | undefined => {
    return appShortcuts.find(s => s.id === id);
};

export default {
    appShortcuts,
    getShortcutFromIntent,
    executeShortcut,
    triggerShortcut,
    getAllShortcuts,
    getShortcutById,
};
