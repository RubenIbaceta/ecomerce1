import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const cost = 32_768;
const blockSize = 8;
const parallelization = 3;
const keyLength = 64;
const maxMemory = 128 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: maxMemory,
    }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return ['scrypt', String(cost), String(blockSize), String(parallelization), salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, storedCost, storedBlockSize, storedParallelization, encodedSalt, encodedKey, extra] = storedHash.split('$');
  if (
    algorithm !== 'scrypt'
    || storedCost !== String(cost)
    || storedBlockSize !== String(blockSize)
    || storedParallelization !== String(parallelization)
    || !encodedSalt
    || !encodedKey
    || extra !== undefined
  ) return false;

  try {
    const salt = Buffer.from(encodedSalt, 'base64url');
    const expectedKey = Buffer.from(encodedKey, 'base64url');
    if (salt.length !== 16 || expectedKey.length !== keyLength) return false;
    const actualKey = await deriveKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
  } catch {
    return false;
  }
}
