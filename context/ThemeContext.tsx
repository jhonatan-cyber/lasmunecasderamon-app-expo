import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_OPTIONS, useThemeStore } from '@/store/themeStore';

import logger from '@/utils/logger';
interface ThemeColors {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    accent: string;
    gradient: string[];
}

interface ThemeContextType {
    theme: 'light' | 'dark';
    colors: ThemeColors;
    accentColor: string;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    setAccentColor: (color: string) => void;
}

const lightColors: ThemeColors = {
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#6366f1',
    secondary: '#8B5CF6',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    accent: '#6366f1',
    gradient: ['#6366f1', '#8B5CF6'],
};

const darkColors: ThemeColors = {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    primary: '#818CF8',
    secondary: '#A78BFA',
    border: '#334155',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    accent: '#818CF8',
    gradient: ['#818CF8', '#A78BFA'],
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const systemColorScheme = useRNColorScheme();
    const [theme, setThemeState] = useState<'light' | 'dark'>('light');
    const [accentColor, setAccentColorState] = useState('#6366f1');
    
    const userAccentColor = useThemeStore((state) => state.getColor);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('app-theme');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setThemeState(savedTheme);
                } else if (systemColorScheme) {
                    setThemeState(systemColorScheme);
                }
                
                const savedAccent = await AsyncStorage.getItem('accent-color');
                if (savedAccent) {
                    setAccentColorState(savedAccent);
                }
            } catch (e) {
              
            }
        };
        
        loadTheme();
    }, [systemColorScheme]);

    const setTheme = async (newTheme: 'light' | 'dark') => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('app-theme', newTheme);
        } catch (e) {
            
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const setAccentColor = async (color: string) => {
        setAccentColorState(color);
        try {
            await AsyncStorage.setItem('accent-color', color);
        } catch (e) {
            logger.captureException(e, { context: 'ThemeContext:setAccentColor' });
        }
    };

    const colors: ThemeColors = {
        ...(theme === 'dark' ? darkColors : lightColors),
        primary: accentColor,
        accent: accentColor,
        gradient: THEME_OPTIONS.find(t => t.color.toLowerCase() === accentColor.toLowerCase())?.gradient || lightColors.gradient,
    };

    return (
        <ThemeContext.Provider value={{ 
            theme, 
            colors, 
            accentColor, 
            setTheme, 
            toggleTheme,
            setAccentColor 
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const useColorScheme = () => {
    return useTheme();
};

