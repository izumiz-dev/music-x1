/**
 * Simple encryption and decryption utility
 * Optimized for use in Chrome extension context
 */

/**
 * Encrypts a string
 * @param text String to encrypt
 * @returns Encrypted string
 */
export async function encryptText(text: string): Promise<string> {
  // Proper encryption rather than simple encoding
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Generate random encryption key
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Generate initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Execute encryption
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  );
  
  // Export the key
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  
  // Combine encrypted data, IV, and key for storage
  const result = {
    data: Array.from(new Uint8Array(encryptedData)),
    iv: Array.from(iv),
    key: Array.from(new Uint8Array(exportedKey))
  };
  
  return JSON.stringify(result);
}

/**
 * Decrypts an encrypted string
 * @param encryptedText Encrypted string
 * @returns Decrypted string, or empty string if decryption fails
 */
export async function decryptText(encryptedText: string): Promise<string> {
  try {
    const { data, iv, key } = JSON.parse(encryptedText);
    
    // Convert to binary data
    const encryptedData = new Uint8Array(data);
    const ivData = new Uint8Array(iv);
    const keyData = new Uint8Array(key);
    
    // Import the key
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['decrypt']
    );
    
    // Execute decryption
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData
      },
      importedKey,
      encryptedData
    );
    
    // Convert decrypted data to text
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}