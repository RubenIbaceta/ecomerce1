const uploadTypes = {
  'image/jpeg': {
    extension: 'jpg',
    signature: (file: Buffer) => file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    signature: (file: Buffer) => file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    extension: 'webp',
    signature: (file: Buffer) => file.length >= 12 && file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WEBP',
  },
} as const;

export function getValidatedImageType(contentType: string | false | null, file: unknown) {
  if (!contentType || !Buffer.isBuffer(file) || file.length === 0) return null;
  const type = uploadTypes[contentType as keyof typeof uploadTypes];
  if (!type || !type.signature(file)) return null;
  return type;
}
