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

// ===== DATABASE SCHEMA SETUP =====
const setupDatabaseSchema = async () => {
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const path = require('path');
  
  let connection;
  
  try {
    console.log('\n🔧 ================================');
    console.log('   DATABASE SCHEMA CHECK');
    console.log('================================\n');
    
    connection = await mysql.createConnection({
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME,
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL for schema check');
    
    // Check if users table exists
    const [existingTables] = await connection.query("SHOW TABLES LIKE 'users'");
    
    if (existingTables.length > 0) {
      console.log('✅ Table "users" exists');
      
      // Verify all tables
      const [allTables] = await connection.query('SHOW TABLES');
      console.log(`📋 Found ${allTables.length} tables in database:`);
      allTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   ✓ ${tableName}`);
      });
      
      await connection.end();
      console.log('✅ Database schema ready\n');
      return true;
    }
    
    // Tables don't exist - import schema
    console.log('⚠️  Table "users" NOT FOUND');
    console.log('🔄 Importing database schema...\n');
    
    const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Schema file not found: ${sqlPath}`);
      console.log('\n📂 Checking alternative locations...');
      
      const alternatives = [
        path.join(__dirname, 'database', 'schema.sql'),
        path.join(__dirname, '..', 'schema.sql'),
        path.join(__dirname, '..', 'sql', 'schema.sql')
      ];
      
      let foundPath = null;
      for (const alt of alternatives) {
        if (fs.existsSync(alt)) {
          foundPath = alt;
          console.log(`✅ Found at: ${alt}`);
          break;
        }
      }
      
      if (!foundPath) {
        console.error('❌ No schema file found in any location!');
        await connection.end();
        return false;
      }
      
      const sql = fs.readFileSync(foundPath, 'utf8');
      console.log('⚡ Executing SQL statements...');
      await connection.query(sql);
    } else {
      console.log(`📄 Reading: ${sqlPath}`);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      console.log('⚡ Executing SQL statements...');
      await connection.query(sql);
    }
    
    // Verify import
    const [newTables] = await connection.query('SHOW TABLES');
    
    if (newTables.length > 0) {
      console.log('\n✅ Schema imported successfully!');
      console.log('📋 Tables created:');
      newTables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   ✓ ${tableName}`);
      });
    } else {
      console.log('\n⚠️  No tables created - check SQL file');
    }
    
    await connection.end();
    console.log('🔌 Connection closed\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ Database schema setup error:', error.message);
    console.error('Stack:', error.stack);
    if (connection) {
      await connection.end();
    }
    // Don't fail - let server continue
    console.log('⚠️  Continuing without schema setup...\n');
    return false;
  }
};

// Test database connection
const connectDatabase = async () => {
  console.log('=== CONNECTING TO DATABASE ===');
  try {
    console.log('Attempting database authentication...');
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    logger.info('✅ Database connection established successfully');

    if (NODE_ENV === 'development') {
      console.log('📊 Development mode: Database models ready');
      logger.info('📊 Database models synced (development mode)');
    }
  } catch (error) {
    console.error('=== DATABASE CONNECTION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Database config:', {
      host: process.env.DB_HOST || process.env.MYSQLHOST,
      database: process.env.DB_NAME || process.env.MYSQLDATABASE,
      username: process.env.DB_USER || process.env.MYSQLUSER,
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
    // Setup database schema FIRST
    await setupDatabaseSchema();
    
    // Then connect with Sequelize
    await connectDatabase();

    console.log(`Attempting to start server on port ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
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
