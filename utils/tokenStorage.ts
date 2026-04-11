import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const storage = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const TokenStorage = {
  async saveToken(token: string) {
    try {
      await storage.setItem(TOKEN_KEY, token);
    } catch (error) {
      logger.error('TokenStorage.saveToken failed', { error });
      throw error;
    }
  },

  async getToken() {
    try {
      return await storage.getItem(TOKEN_KEY);
    } catch (error) {
      logger.error('TokenStorage.getToken failed', { error });
      return null;
    }
  },

  async saveRefreshToken(refreshToken: string) {
    try {
      await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      logger.error('TokenStorage.saveRefreshToken failed', { error });
      throw error;
    }
  },

  async getRefreshToken() {
    try {
      return await storage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.error('TokenStorage.getRefreshToken failed', { error });
      return null;
    }
  },

  async removeTokens() {
    try {
      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.error('TokenStorage.removeTokens failed', { error });
      throw error;
    }
  },
};
