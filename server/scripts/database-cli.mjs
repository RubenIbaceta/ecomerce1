import { spawnSync } from 'node:child_process';

export function postgresCommand(tool, cwd) {
  const dockerAvailable = spawnSync('docker', ['compose', 'version'], { cwd, stdio: 'ignore' }).status === 0;
  if (dockerAvailable) {
    return { command: 'docker', args: ['compose', 'exec', '-T', 'db', tool, '-U', process.env.POSTGRES_USER || 'postgres', '-d', process.env.POSTGRES_DB || 'electronics_store'], env: process.env };
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Configura DATABASE_URL para conectar con PostgreSQL.');
  const database = new URL(databaseUrl);
  const password = database.password ? decodeURIComponent(database.password) : undefined;
  return {
    command: tool,
    args: ['-h', database.hostname, '-p', database.port || '5432', '-U', decodeURIComponent(database.username), '-d', decodeURIComponent(database.pathname.slice(1))],
    env: { ...process.env, ...(password ? { PGPASSWORD: password } : {}), ...(database.searchParams.has('sslmode') ? { PGSSLMODE: database.searchParams.get('sslmode') } : {}) },
  };
}
