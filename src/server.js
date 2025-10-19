require('dotenv').config();
require('express-async-errors'); // Handle async errors automatically

console.log('🔥🔥🔥 SERVER.JS LOADED - VERSION 3.0 🔥🔥🔥');
console.log('=== SERVER STARTING ===');
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  API_PREFIX: process.env.API_PREFIX,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  MYSQLHOST: process.env.MYSQLHOST ? 'SET' : 'NOT SET',
  MYSQLDATABASE: process.env.MYSQLDATABASE ? 'SET' : 'NOT SET'
});

const app = require('./app');
const logger = require('./config/logger');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`Server configuration: PORT=${PORT}, NODE_ENV=${NODE_ENV}`);

// ===== EMERGENCY DATABASE SETUP ENDPOINT =====
app.get('/emergency-setup', async (req, res) => {
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const path = require('path');
  
  const logs = [];
  let connection;
  
  try {
    logs.push('🚨 EMERGENCY SETUP TRIGGERED');
    logs.push(`Current directory: ${__dirname}`);
    
    const config = {
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME,
      multipleStatements: true
    };
    
    logs.push(`Connecting to: ${config.host}:${config.port}/${config.database}`);
    
    connection = await mysql.createConnection(config);
    logs.push('✅ Connected to MySQL');
    
    // Check existing tables
    const [existingTables] = await connection.query('SHOW TABLES');
    logs.push(`Current tables: ${existingTables.length}`);
    existingTables.forEach(t => logs.push(`  - ${Object.values(t)[0]}`));
    
    const [userTable] = await connection.query("SHOW TABLES LIKE 'users'");
    if (userTable.length > 0) {
      await connection.end();
      return res.json({ 
        success: true, 
        message: 'Tables already exist',
        tables: existingTables.map(t => Object.values(t)[0]),
        logs 
      });
    }
    
    // Find schema.sql
    const paths = [
      path.join(__dirname, '..', 'database', 'schema.sql'),
      path.join(__dirname, 'database', 'schema.sql'),
      path.join(__dirname, '..', 'schema.sql'),
      path.join(__dirname, '..', 'sql', 'schema.sql')
    ];
    
    let sqlPath = null;
    for (const p of paths) {
      logs.push(`Checking: ${p}`);
      if (fs.existsSync(p)) {
        sqlPath = p;
        logs.push(`✅ FOUND: ${p}`);
        break;
      } else {
        logs.push(`❌ Not found: ${p}`);
      }
    }
    
    if (!sqlPath) {
      await connection.end();
      
      // List all files in directories
      logs.push('\n📂 Files in root:');
      fs.readdirSync(path.join(__dirname, '..')).forEach(f => logs.push(`  - ${f}`));
      
      if (fs.existsSync(path.join(__dirname, '..', 'database'))) {
        logs.push('\n📂 Files in database/:');
        fs.readdirSync(path.join(__dirname, '..', 'database')).forEach(f => logs.push(`  - ${f}`));
      }
      
      return res.status(404).json({ 
        error: 'schema.sql not found in any location',
        logs 
      });
    }
    
    // Read and execute SQL
    const sql = fs.readFileSync(sqlPath, 'utf8');
    logs.push(`📄 SQL file size: ${sql.length} bytes`);
    logs.push(`First 100 chars: ${sql.substring(0, 100)}...`);
    
    logs.push('⚡ Executing SQL...');
    await connection.query(sql);
    logs.push('✅ SQL executed successfully');
    
    // Verify
    const [newTables] = await connection.query('SHOW TABLES');
    logs.push(`✅ Tables created: ${newTables.length}`);
    
    const tableNames = newTables.map(t => Object.values(t)[0]);
    tableNames.forEach(name => logs.push(`  ✓ ${name}`));
    
    await connection.end();
    
    res.json({ 
      success: true, 
      message: '🎉 Database setup complete!',
      tablesCreated: tableNames,
      logs 
    });
    
  } catch (error) {
    if (connection) await connection.end();
    
    logs.push(`❌ ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
    
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      logs 
    });
  }
});

// ===== DATABASE SCHEMA SETUP =====
const setupDatabaseSchema = async () => {
  const mysql = require('mysql2/promise');
  const fs = require('fs');
  const path = require('path');
  
  let connection;
  
  try {
    console.log('\n🔥 setupDatabaseSchema() CALLED');
    console.log('🔧 ================================');
    console.log('   DATABASE SCHEMA CHECK');
    console.log('================================\n');
    
    const config = {
      host: process.env.MYSQLHOST || process.env.DB_HOST,
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER,
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME,
      multipleStatements: true
    };
    
    console.log('Connection config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user
    });
    
    connection = await mysql.createConnection(config);
    
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
        console.log(`Checking: ${alt}`);
        if (fs.existsSync(alt)) {
          foundPath = alt;
          console.log(`✅ Found at: ${alt}`);
          break;
        }
      }
      
      if (!foundPath) {
        console.error('❌ No schema file found in any location!');
        console.log('\n📂 Current directory contents:');
        try {
          fs.readdirSync(__dirname).forEach(f => console.log(`  - ${f}`));
        } catch (e) {
          console.log('Could not list directory');
        }
        await connection.end();
        return false;
      }
      
      const sql = fs.readFileSync(foundPath, 'utf8');
      console.log(`📄 SQL file size: ${sql.length} bytes`);
      console.log('⚡ Executing SQL statements...');
      await connection.query(sql);
    } else {
      console.log(`📄 Reading: ${sqlPath}`);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`📄 SQL file size: ${sql.length} bytes`);
      
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
      try {
        await connection.end();
      } catch (e) {
        console.error('Error closing connection:', e.message);
      }
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
  console.log('🔥 startServer() CALLED');
  console.log('=== STARTING SERVER ===');
  try {
    console.log('🔥 About to call setupDatabaseSchema()...');
    
    // Setup database schema FIRST
    await setupDatabaseSchema();
    
    console.log('🔥 setupDatabaseSchema() completed');
    
    // Then connect with Sequelize
    await connectDatabase();

    console.log(`Attempting to start server on port ${PORT}...`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('=== SERVER STARTED SUCCESSFULLY ===');
      console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
      console.log(`📡 API endpoint: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
      console.log(`🚨 Emergency setup: http://localhost:${PORT}/emergency-setup`);
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
console.log('🔥 About to call startServer()...');
startServer();

module.exports = app;
