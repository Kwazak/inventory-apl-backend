const { Sequelize } = require('sequelize');
const config = require('../config/database');
const logger = require('../config/logger');

console.log('=== INITIALIZING SEQUELIZE ===');

const env = process.env.NODE_ENV || 'development';
console.log('Environment:', env);

let sequelize;
let dbConfig;

try {
  dbConfig = config[env];
  
  console.log('Database configuration:', {
    database: dbConfig.database,
    username: dbConfig.username ? '***' : 'NOT SET',
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    timezone: dbConfig.timezone,
    storage: dbConfig.storage || 'N/A'
  });

  // Create Sequelize instance
  console.log('Creating Sequelize instance...');
  
  // PostgreSQL/MySQL configuration - NO SQLite fallback
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      timezone: dbConfig.timezone,
      logging: dbConfig.logging,
      pool: dbConfig.pool,
      define: dbConfig.define,
      dialectOptions: dbConfig.dialectOptions || {},
    }
  );
  
  console.log('✓ Sequelize instance created');
  
} catch (error) {
  console.error('❌ ERROR creating Sequelize instance:', error.message);
  console.error('Stack:', error.stack);
  
  // Don't create fallback - just throw
  console.error('❌ CRITICAL: Cannot start without database');
  console.error('❌ Please add MySQL database in Railway dashboard');
  
  throw error;
}

// Test database connection
const connectDB = async () => {
  console.log('=== TESTING DATABASE CONNECTION ===');
  
  try {
    console.log('Attempting to authenticate with database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    logger.info('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('=== DATABASE CONNECTION FAILED ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.original?.code);
    console.error('Error errno:', error.original?.errno);
    
    // Log but don't throw - let the app decide what to do
    logger.error('❌ Unable to connect to database:', error);
    
    // In production, we might want to throw, but for Railway deployment
    // we'll just log and return false
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_NO_DB) {
      console.error('⚠️  Production mode requires database connection');
      throw error;
    }
    
    console.warn('⚠️  Continuing without database connection (development/fallback mode)');
    return false;
  }
};

// Sync database (use with caution in production)
const syncDB = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('📊 Database synchronized successfully');
    return true;
  } catch (error) {
    logger.error('❌ Database sync failed:', error);
    throw error;
  }
};

// Close database connection
const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Database connection closed');
    return true;
  } catch (error) {
    logger.error('❌ Error closing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
  syncDB,
  closeDB,
};
