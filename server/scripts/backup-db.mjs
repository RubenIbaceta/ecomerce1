import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresCommand } from './database-cli.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: join(root, '.env') });
const directory = join(root, 'backups');
const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = join(directory, `electrostore-${timestamp}.dump`);

await mkdir(directory, { recursive: true });
const command = postgresCommand('pg_dump', root);
const child = spawn(command.command, [...command.args, '-Fc'], { cwd: root, env: command.env, stdio: ['ignore', 'pipe', 'inherit'] });
const output = createWriteStream(destination, { flags: 'wx' });
child.stdout.pipe(output);
try {
  const [, code] = await Promise.all([once(output, 'finish'), once(child, 'close')]);
  if (code !== 0) throw new Error(`pg_dump terminó con código ${code}.`);
  console.log(`Respaldo creado: ${destination}`);
} catch (error) {
  output.destroy();
  await rm(destination, { force: true });
  throw error;
}
