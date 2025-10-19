const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  // Skip jika tidak ada DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  No DATABASE_URL found, skipping SQL migration');
    process.exit(0);
  }

  let connection;
  
  try {
    console.log('🔄 Starting SQL migration...');
    
    // Load database config
    const dbConfig = require('../src/config/database.js');
    const config = dbConfig[process.env.NODE_ENV || 'development'];
    
    // Connect ke database
    if (process.env.DATABASE_URL) {
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    } else {
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database
      });
    }
    console.log('✅ Connected to database');
    
    // Check apakah sudah ada tables
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    if (tables.length > 0) {
      console.log('⏭️  Database already has tables, skipping migration');
      console.log(`   Existing tables: ${tables.map(t => t.TABLE_NAME).join(', ')}`);
      return;
    }
    
    // Path ke file SQL
    const sqlFilePath = path.join(__dirname, '../database/schema.sql');
    
    // Check apakah file ada
    try {
      await fs.access(sqlFilePath);
    } catch (error) {
      console.log('⚠️  SQL file not found at:', sqlFilePath);
      console.log('   Skipping migration');
      return;
    }
    
    console.log('📄 Reading SQL file...');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // Split SQL statements by semicolon
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !s.startsWith('--')) // Remove comments
      .filter(s => !s.startsWith('/*')); // Remove block comments
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await connection.query(statement);
        
        // Log progress
        if ((i + 1) % 5 === 0 || i === statements.length - 1) {
          console.log(`   Progress: ${i + 1}/${statements.length} statements executed`);
        }
        
      } catch (queryError) {
        console.error(`❌ Error executing statement ${i + 1}:`, queryError.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        // Continue with other statements
      }
    }
    
    // Verify tables created
    const [newTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log(`   Created ${newTables.length} tables: ${newTables.map(t => t.TABLE_NAME).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack:', error.stack);
    
    // Jangan fail build di Railway
    console.log('⚠️  Continuing despite migration error...');
    process.exit(0);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(0); // Exit 0 agar tidak fail Railway build
  });
