import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Real Estate Platform Backend running on http://localhost:${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  console.log(`🌱 Environment: ${env.NODE_ENV}`);
});

function gracefulShutdown(signal: string): void {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds if not gracefully closed
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
