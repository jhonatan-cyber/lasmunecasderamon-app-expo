import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store no tiene implementación web (su módulo es un objeto vacío),
// así que en el navegador se guarda en AsyncStorage (localStorage) para no
// romper el login ni la sesión.
export const secureStorage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async getItem(key: string) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};