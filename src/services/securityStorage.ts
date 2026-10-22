import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PIN_KEY = "hawk_secure_pin";
const RECOVERY_KEY = "hawk_secure_recovery_key";
const PIN_SALT = "hawk_pin_salt_v1";

// In-memory fallback for web environment where SecureStore is not supported
const memoryFallback: Record<string, string> = {};

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PIN_SALT}:${pin}`
  );
}

export async function saveSecurePin(pin: string): Promise<void> {
  const hashedPin = await hashPin(pin);
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(PIN_KEY, hashedPin);
  } else {
    memoryFallback[PIN_KEY] = hashedPin;
  }
}

export async function getSecurePin(): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return await SecureStore.getItemAsync(PIN_KEY);
  }
  return memoryFallback[PIN_KEY] || null;
}

export async function deleteSecurePin(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(PIN_KEY);
  } else {
    delete memoryFallback[PIN_KEY];
  }
}

export async function saveSecureRecoveryKey(key: string): Promise<void> {
  const cleaned = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (await isSecureStoreAvailable()) {
    await SecureStore.setItemAsync(RECOVERY_KEY, cleaned);
  } else {
    memoryFallback[RECOVERY_KEY] = cleaned;
  }
}

export async function getSecureRecoveryKey(): Promise<string | null> {
  if (await isSecureStoreAvailable()) {
    return await SecureStore.getItemAsync(RECOVERY_KEY);
  }
  return memoryFallback[RECOVERY_KEY] || null;
}

export async function deleteSecureRecoveryKey(): Promise<void> {
  if (await isSecureStoreAvailable()) {
    await SecureStore.deleteItemAsync(RECOVERY_KEY);
  } else {
    delete memoryFallback[RECOVERY_KEY];
  }
}

export async function hasSecurePin(): Promise<boolean> {
  const pin = await getSecurePin();
  return Boolean(pin && pin.length >= 4);
}

export async function verifySecurePin(enteredPin: string): Promise<boolean> {
  const stored = await getSecurePin();
  if (!stored) return false;

  // Backward compatibility: If stored value is legacy 4-digit plaintext, compare directly and upgrade to hash
  if (stored === enteredPin) {
    await saveSecurePin(enteredPin);
    return true;
  }

  const enteredHash = await hashPin(enteredPin);
  return stored === enteredHash;
}

export async function verifySecureRecoveryKey(enteredKey: string): Promise<boolean> {
  const stored = await getSecureRecoveryKey();
  if (!stored) return false;
  const cleaned = enteredKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned === stored;
}
