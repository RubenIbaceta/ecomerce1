import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresCommand } from './database-cli.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const archive = process.argv[2];
if (!archive || process.argv[3] !== '--confirm-restore') {
  console.error('Uso: npm run db:restore -- <archivo.dump> --confirm-restore');
  console.error('La restauración reemplaza datos existentes en la base configurada.');
  process.exitCode = 2;
} else {
  const absoluteArchive = resolve(root, archive);
  await access(absoluteArchive);
  const command = postgresCommand('pg_restore', root);
  const child = spawn(command.command, [...command.args, '--clean', '--if-exists', '--no-owner'], { cwd: root, env: command.env, stdio: ['pipe', 'inherit', 'inherit'] });
  createReadStream(absoluteArchive).pipe(child.stdin);
  const code = await new Promise((resolveCode, reject) => {
    child.once('error', reject);
    child.once('close', resolveCode);
  });
  if (code !== 0) process.exitCode = typeof code === 'number' ? code : 1;
  else console.log('Restauración completada.');
}
