import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'uski:';

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export async function clearUserData(keys: string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys.map((k) => PREFIX + k));
}
