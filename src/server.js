require('dotenv').config();
require('express-async-errors'); // Handle async errors automatically

console.log('🔥🔥🔥 SERVER.JS LOADED - VERSION 3.1 🔥🔥🔥');
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

// ===== EMERGENCY CREATE ADMIN USER ENDPOINT =====
app.post('/emergency-create-admin', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const logs = [];
  
  try {
    logs.push('🚨 EMERGENCY CREATE ADMIN TRIGGERED');
    
    // Import User model
    const { User } = require('./models');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    
    if (existingAdmin) {
      logs.push('⚠️  Admin user already exists');
      logs.push(`Username: ${existingAdmin.username}`);
      logs.push(`Role: ${existingAdmin.role}`);
      logs.push(`Email: ${existingAdmin.email}`);
      
      // Update password saja
      logs.push('🔄 Updating admin password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.update(
        { password: hashedPassword },
        { where: { username: 'admin' } }
      );
      
      logs.push('✅ Admin password updated to: admin123');
      
      return res.json({
        success: true,
        message: '✅ Admin password updated successfully!',
        credentials: {
          username: 'admin',
          password: 'admin123'
        },
        logs
      });
    }
    
    // Create new admin
    logs.push('📝 Creating new admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    logs.push('🔐 Password hashed successfully');
    
    const admin = await User.create({
      username: 'admin',
      password: hashedPassword,
      full_name: 'Administrator',
      role: 'admin',
      email: 'admin@factory.com',
      is_active: true
    });
    
    logs.push('✅ Admin user created successfully!');
    logs.push(`ID: ${admin.id}`);
    logs.push(`Username: ${admin.username}`);
    logs.push(`Role: ${admin.role}`);
    
    // Create additional users
    logs.push('\n📝 Creating additional users...');
    
    const viewerPassword = await bcrypt.hash('admin123', 10);
    const viewer = await User.create({
      username: 'viewer',
      password: viewerPassword,
      full_name: 'Dashboard Viewer',
      role: 'viewer',
      email: 'viewer@factory.com',
      is_active: true
    });
    logs.push('✅ Viewer user created');
    
    const staffPassword = await bcrypt.hash('admin123', 10);
    const staff = await User.create({
      username: 'operator1',
      password: staffPassword,
      full_name: 'Operator Produksi',
      role: 'staff',
      email: 'operator@factory.com',
      is_active: true
    });
    logs.push('✅ Staff user created');
    
    res.json({
      success: true,
      message: '🎉 All users created successfully!',
      users: [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'viewer', password: 'admin123', role: 'viewer' },
        { username: 'operator1', password: 'admin123', role: 'staff' }
      ],
      logs
    });
    
  } catch (error) {
    logs.push(`❌ ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      logs
    });
  }
});

// ===== EMERGENCY INSERT SAMPLE DATA =====
app.post('/emergency-insert-data', async (req, res) => {
  const logs = [];
  
  try {
    logs.push('🚨 EMERGENCY INSERT SAMPLE DATA TRIGGERED');
    
    const { 
      User, 
      Supplier, 
      Customer, 
      RawMaterial, 
      Product, 
      BOM 
    } = require('./models');
    
    const bcrypt = require('bcryptjs');
    
    // 1. INSERT USERS
    logs.push('\n📝 Creating users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.bulkCreate([
      {
        username: 'admin',
        password: hashedPassword,
        full_name: 'Administrator',
        role: 'admin',
        email: 'admin@factory.com',
        is_active: true
      },
      {
        username: 'viewer',
        password: hashedPassword,
        full_name: 'Dashboard Viewer',
        role: 'viewer',
        email: 'viewer@factory.com',
        is_active: true
      },
      {
        username: 'operator1',
        password: hashedPassword,
        full_name: 'Operator Produksi',
        role: 'staff',
        email: 'operator@factory.com',
        is_active: true
      }
    ], { ignoreDuplicates: true });
    logs.push('✅ Users created');
    
    // 2. INSERT SUPPLIERS
    logs.push('\n📝 Creating suppliers...');
    const suppliers = await Supplier.bulkCreate([
      {
        name: 'PT Karet Indonesia',
        contact: 'Budi',
        phone: '081234567890',
        address: 'Jakarta',
        status: 'active'
      },
      {
        name: 'CV Foam Makmur',
        contact: 'Siti',
        phone: '081234567891',
        address: 'Bandung',
        status: 'active'
      },
      {
        name: 'Toko Bahan Sejahtera',
        contact: 'Ahmad',
        phone: '081234567892',
        address: 'Surabaya',
        status: 'active'
      }
    ], { ignoreDuplicates: true });
    logs.push(`✅ ${suppliers.length} suppliers created`);
    
    // 3. INSERT CUSTOMERS
    logs.push('\n📝 Creating customers...');
    const customers = await Customer.bulkCreate([
      {
        name: 'Toko Sepatu Jaya',
        contact: 'Dewi',
        phone: '081234567893',
        type: 'wholesale',
        status: 'active'
      },
      {
        name: 'CV Retail Maju',
        contact: 'Rudi',
        phone: '081234567894',
        type: 'wholesale',
        status: 'active'
      },
      {
        name: 'Konsumen Umum',
        contact: '-',
        phone: '0000000000',
        type: 'retail',
        status: 'active'
      }
    ], { ignoreDuplicates: true });
    logs.push(`✅ ${customers.length} customers created`);
    
    // 4. INSERT RAW MATERIALS
    logs.push('\n📝 Creating raw materials...');
    const materials = await RawMaterial.bulkCreate([
      {
        sku: 'RM001',
        name: 'Karet Sol Hitam',
        category: 'Karet',
        unit: 'kg',
        unit_price: 25000,
        stock: 500,
        min_stock: 100,
        supplier_id: 1,
        status: 'active'
      },
      {
        sku: 'RM002',
        name: 'EVA Foam 10mm',
        category: 'Foam',
        unit: 'lembar',
        unit_price: 15000,
        stock: 200,
        min_stock: 50,
        supplier_id: 2,
        status: 'active'
      },
      {
        sku: 'RM003',
        name: 'Strap Nilon',
        category: 'Aksesoris',
        unit: 'meter',
        unit_price: 3000,
        stock: 800,
        min_stock: 200,
        supplier_id: 3,
        status: 'active'
      },
      {
        sku: 'RM004',
        name: 'Lem PU',
        category: 'Kimia',
        unit: 'liter',
        unit_price: 45000,
        stock: 100,
        min_stock: 20,
        supplier_id: 2,
        status: 'active'
      }
    ], { ignoreDuplicates: true });
    logs.push(`✅ ${materials.length} raw materials created`);
    
    // 5. INSERT PRODUCTS
    logs.push('\n📝 Creating products...');
    const products = await Product.bulkCreate([
      {
        sku: 'PRD001',
        name: 'Sandal Jepit Classic',
        category: 'Sandal Casual',
        type: 'sendal',
        size: '39',
        color: 'Hitam',
        unit_price: 35000,
        stock: 200,
        min_stock: 50,
        status: 'active'
      },
      {
        sku: 'PRD002',
        name: 'Sandal Gunung Adventure',
        category: 'Sandal Outdoor',
        type: 'sendal',
        size: '40',
        color: 'Coklat',
        unit_price: 150000,
        stock: 100,
        min_stock: 30,
        status: 'active'
      },
      {
        sku: 'PRD003',
        name: 'Safety Boot Steel Toe',
        category: 'Boot Safety',
        type: 'boot',
        size: '40',
        color: 'Hitam',
        unit_price: 350000,
        stock: 50,
        min_stock: 20,
        status: 'active'
      }
    ], { ignoreDuplicates: true });
    logs.push(`✅ ${products.length} products created`);
    
    // 6. INSERT BOM (Bill of Materials)
    logs.push('\n📝 Creating BOM entries...');
    const boms = await BOM.bulkCreate([
      { product_id: 1, material_id: 1, quantity: 0.3 },
      { product_id: 1, material_id: 3, quantity: 0.5 },
      { product_id: 2, material_id: 1, quantity: 0.5 },
      { product_id: 2, material_id: 2, quantity: 1 },
      { product_id: 2, material_id: 3, quantity: 1 },
      { product_id: 3, material_id: 1, quantity: 1 },
      { product_id: 3, material_id: 2, quantity: 2 }
    ], { ignoreDuplicates: true });
    logs.push(`✅ ${boms.length} BOM entries created`);
    
    logs.push('\n🎉 ALL SAMPLE DATA INSERTED SUCCESSFULLY!');
    
    res.json({
      success: true,
      message: '🎉 Sample data inserted successfully!',
      summary: {
        users: 3,
        suppliers: suppliers.length,
        customers: customers.length,
        materials: materials.length,
        products: products.length,
        bom_entries: boms.length
      },
      credentials: {
        admin: { username: 'admin', password: 'admin123' },
        viewer: { username: 'viewer', password: 'admin123' },
        staff: { username: 'operator1', password: 'admin123' }
      },
      logs
    });
    
  } catch (error) {
    logs.push(`❌ ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);
    
    res.status(500).json({
      success: false,
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
      console.log(`\n🚨 EMERGENCY ENDPOINTS (DELETE AFTER USE!):`);
      console.log(`   GET  ${process.env.API_PREFIX || ''}/emergency-setup - Setup database schema`);
      console.log(`   POST ${process.env.API_PREFIX || ''}/emergency-create-admin - Create admin users`);
      console.log(`   POST ${process.env.API_PREFIX || ''}/emergency-insert-data - Insert ALL sample data\n`);
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
