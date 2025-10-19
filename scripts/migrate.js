const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  let connection;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbUrl);
    console.log('✅ Connected!');
    
    // Cek apakah table sudah ada
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    if (tables.length > 0) {
      console.log('⏭️  Database already initialized, skipping migration');
      return;
    }
    
    console.log('🔄 Running migrations...');
    
    // Baca file SQL
    const sqlPath = path.join(__dirname, '../database/schema.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    // Split by ; dan filter empty
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Execute satu per satu
    for (let i = 0; i < statements.length; i++) {
      console.log(`   Executing statement ${i + 1}/${statements.length}`);
      await connection.query(statements[i]);
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigrations;