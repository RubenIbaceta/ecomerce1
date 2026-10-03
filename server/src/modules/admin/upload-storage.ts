import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

export const uploadsDirectory = process.env.UPLOADS_DIR?.trim()
  ? resolve(process.env.UPLOADS_DIR.trim())
  : fileURLToPath(new URL('../../../uploads/', import.meta.url));

export async function storeUploadedImage(file: Buffer, extension: string) {
  await mkdir(uploadsDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(join(uploadsDirectory, filename), file, { flag: 'wx' });
  return `/api/v1/uploads/${filename}`;
}
