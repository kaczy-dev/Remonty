// Web Crypto API - Privacy-First End-to-End Encryption (E2EE) for RenovAI

export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptRenovAIVault(data: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt);

  const jsonString = JSON.stringify(data);
  const encodedData = new TextEncoder().encode(jsonString);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  const payload = {
    version: '1.0.0',
    cipher: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256-100K',
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext)),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

export async function decryptRenovAIVault(encryptedJson: string, passphrase: string): Promise<unknown> {
  const payload = JSON.parse(encryptedJson);
  if (!payload.salt || !payload.iv || !payload.data) {
    throw new Error('Nieprawidłowy format sejfu RenovAI');
  }

  const salt = new Uint8Array(payload.salt);
  const iv = new Uint8Array(payload.iv);
  const data = new Uint8Array(payload.data);

  const key = await deriveKeyFromPassphrase(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(passphrase));
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export async function exportEncryptedBackup(data: unknown, passphrase: string): Promise<string> {
  return encryptRenovAIVault(data, passphrase);
}

export async function importEncryptedBackup(encryptedJson: string, passphrase: string): Promise<any> {
  return decryptRenovAIVault(encryptedJson, passphrase);
}

