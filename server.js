const path = require('path');
const fs = require('fs');

const isRoot = fs.existsSync('./backend/src/app.js');
const envPath = isRoot ? './backend/.env' : './.env';
require('dotenv').config({ path: envPath });

const http = require('http');
const srcPrefix = isRoot ? './backend/src' : './src';
const app = require(`${srcPrefix}/app`);
const connectDB = require(`${srcPrefix}/config/db`);
const { initMatcher } = require(`${srcPrefix}/services/matcher`);
const logger = require(`${srcPrefix}/utils/logger`);

// TODO: investigate adding clustering for scaling (priority for next sprint)
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initMatcher();
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
