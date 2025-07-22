const crypto = require('crypto');

// Clave de encriptación desde variable de entorno o generada
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'whatsapp-bot-encryption-key-2024-ultra-secure-256bits-fixed';
const ALGORITHM = 'aes-256-gcm';

// Asegurar que la clave tenga exactamente 32 bytes para AES-256
const getEncryptionKey = () => {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  return key;
};

/**
 * Encriptar texto (API keys, tokens sensibles)
 * @param {string} text - Texto a encriptar
 * @returns {string} - Texto encriptado en formato: iv:encryptedData:authTag
 */
const encrypt = (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text to encrypt must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // Vector de inicialización único
    
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('whatsapp-bot', 'utf8')); // Datos adicionales autenticados
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: iv:encryptedData:authTag
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Desencriptar texto
 * @param {string} encryptedText - Texto encriptado en formato: iv:encryptedData:authTag
 * @returns {string} - Texto original desencriptado
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('Encrypted text must be a non-empty string');
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const [ivHex, encryptedData, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('whatsapp-bot', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
    
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
};

/**
 * Verificar si un string está encriptado (tiene formato correcto)
 * @param {string} text - Texto a verificar
 * @returns {boolean} - true si parece estar encriptado
 */
const isEncrypted = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const parts = text.split(':');
  return parts.length === 3 && 
         parts.every(part => /^[a-f0-9]+$/i.test(part)) && 
         parts[0].length === 32; // IV de 16 bytes = 32 chars hex
};

/**
 * Encriptar API key de OpenAI de forma segura
 * @param {string} apiKey - API key de OpenAI
 * @returns {string} - API key encriptada
 */
const encryptOpenAIKey = (apiKey) => {
  if (!apiKey) {
    return null;
  }
  
  // Validar formato de API key de OpenAI
  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }
  
  return encrypt(apiKey);
};

/**
 * Desencriptar API key de OpenAI
 * @param {string} encryptedApiKey - API key encriptada
 * @returns {string} - API key original
 */
const decryptOpenAIKey = (encryptedApiKey) => {
  if (!encryptedApiKey) {
    return null;
  }
  
  if (!isEncrypted(encryptedApiKey)) {
    // Si no está encriptada, asumir que es texto plano (migración)
    console.warn('[Encryption] API key appears to be in plain text, should be encrypted');
    return encryptedApiKey;
  }
  
  return decrypt(encryptedApiKey);
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptOpenAIKey,
  decryptOpenAIKey
}; 