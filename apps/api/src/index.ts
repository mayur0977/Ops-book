import { buildApp } from './app.js';
import { loadEnv } from './env.js';

/**
 * Boot order matters: the environment is validated before anything is
 * constructed, so a missing secret is a startup failure rather than a 500
 * discovered by the first user to log in.
 */
const env = loadEnv();
const app = await buildApp(env);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.fatal({ err: error }, 'failed to start');
  process.exit(1);
}
