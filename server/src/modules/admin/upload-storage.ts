import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const uploadsDirectory = fileURLToPath(new URL('../../../uploads/', import.meta.url));

export async function storeUploadedImage(file: Buffer, extension: string) {
  await mkdir(uploadsDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(join(uploadsDirectory, filename), file, { flag: 'wx' });
  return `/api/v1/uploads/${filename}`;
}
