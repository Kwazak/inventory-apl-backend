require('dotenv').config();
require('express-async-errors'); // Handle async errors automatically

console.log('=== SERVER STARTING ===');
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  API_PREFIX: process.env.API_PREFIX,
  CORS_ORIGIN: process.env.CORS_ORIGIN
});

const app = require('./app');
const logger = require('./config/logger');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`Server configuration: PORT=${PORT}, NODE_ENV=${NODE_ENV}`);

// Test database connection
const connectDatabase = async () => {
  console.log('=== CONNECTING TO DATABASE ===');
  try {
    console.log('Attempting database authentication...');
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    logger.info('✅ Database connection established successfully');

    if (NODE_ENV === 'development') {
      // Sync models in development (be careful with this in production)
      // await sequelize.sync({ alter: true });
      console.log('📊 Development mode: Database models ready');
      logger.info('📊 Database models synced (development mode)');
    }
  } catch (error) {
    console.error('=== DATABASE CONNECTION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Database config:', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      dialect: process.env.DB_DIALECT
    });
    logger.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  console.log('=== STARTING SERVER ===');
  try {
    await connectDatabase();

    console.log(`Attempting to start server on port ${PORT}...`);
    const server = app.listen(PORT, () => {
      console.log('=== SERVER STARTED SUCCESSFULLY ===');
      console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
      logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`📡 API endpoint: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
      
      if (process.env.ENABLE_SWAGGER === 'true') {
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n=== ${signal} RECEIVED - SHUTTING DOWN ===`);
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        logger.info('✅ HTTP server closed');
        
        try {
          await sequelize.close();
          console.log('✅ Database connection closed');
          logger.info('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during database shutdown:', error);
          logger.error('❌ Error during database shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('=== UNCAUGHT EXCEPTION ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('=== UNHANDLED REJECTION ===');
      console.error('Promise:', promise);
      console.error('Reason:', reason);
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('=== FAILED TO START SERVER ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;
