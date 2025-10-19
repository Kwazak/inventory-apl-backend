const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importDatabase() {
  let connection;
  
  try {
    console.log('=================================');
    console.log('  Railway MySQL Database Import  ');
    console.log('=================================\n');
    
    console.log('🔄 Connecting to Railway MySQL...');
    
    // Koneksi menggunakan Railway env variables
    connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database!\n');
    
    // Cek apakah tabel sudah ada (skip import jika sudah ada)
    const [existingTables] = await connection.query("SHOW TABLES LIKE 'users'");
    
    if (existingTables.length > 0) {
      console.log('⚠️  Tables already exist, skipping import');
      console.log('✅ Database already initialized\n');
      return;
    }
    
    // Path ke file schema.sql di folder database
    const sqlFilePath = path.join(__dirname, 'database', 'schema.sql');
    
    // Cek apakah file ada
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ File not found: ${sqlFilePath}`);
      console.log('\n💡 Available SQL files in current directory:');
      const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql'));
      if (files.length > 0) {
        files.forEach(f => console.log(`   - ${f}`));
        console.log('\n   Update the path in importDB.js if needed.\n');
      } else {
        console.log('   No .sql files found!\n');
      }
      process.exit(1);
    }
    
    console.log('📄 Reading SQL file:', sqlFilePath);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('⚡ Executing SQL statements...\n');
    await connection.query(sql);
    
    console.log('✅ Database imported successfully!\n');
    
    // Verifikasi
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length > 0) {
      console.log('📋 Tables created:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   ✓ ${tableName}`);
      });
    }
    
    // Cek jumlah users
    try {
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n👥 Total users: ${users[0].count}`);
    } catch (err) {
      // Ignore
    }
    
    console.log('\n🎉 Import completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Import failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Check:');
      console.log('   - MySQL service is running');
      console.log('   - Environment variables are correct');
    }
    
    throw error;
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed\n');
    }
  }
}

// Run import
importDatabase()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
