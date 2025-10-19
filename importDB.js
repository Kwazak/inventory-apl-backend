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
    console.log('Host:', process.env.MYSQLHOST || 'Not set');
    console.log('Database:', process.env.MYSQLDATABASE || 'Not set');
    console.log('User:', process.env.MYSQLUSER || 'Not set');
    
    // Koneksi menggunakan Railway env variables
    connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      port: process.env.MYSQLPORT || 3306,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      multipleStatements: true // PENTING untuk import SQL file
    });
    
    console.log('✅ Connected to database!\n');
    
    // Path ke file schema.sql - SESUAIKAN jika perlu
    const sqlFilePath = path.join(__dirname, 'database', 'schema.sql');
    
    // Cek apakah file ada
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ File not found: ${sqlFilePath}`);
      console.log('\n💡 Tip: Pastikan file schema.sql ada di folder yang sama dengan importDB.js');
      console.log('   Atau sesuaikan path di script ini.\n');
      process.exit(1);
    }
    
    console.log('📄 Reading SQL file:', sqlFilePath);
    
    // Baca file SQL
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('⚡ Executing SQL statements...');
    console.log('   (This may take a moment...)\n');
    
    // Execute SQL
    await connection.query(sql);
    
    console.log('✅ Database imported successfully!\n');
    
    // Verifikasi: tampilkan semua tabel yang dibuat
    console.log('📋 Checking created tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log('✅ Tables created:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   ✓ ${tableName}`);
      });
    } else {
      console.log('⚠️  No tables found');
    }
    
    // Cek jumlah data di beberapa tabel (opsional)
    console.log('\n📊 Data summary:');
    try {
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`   👥 Users: ${users[0].count}`);
    } catch (err) {
      console.log('   ⚠️  Users table check skipped');
    }
    
    try {
      const [products] = await connection.query('SELECT COUNT(*) as count FROM products');
      console.log(`   📦 Products: ${products[0].count}`);
    } catch (err) {
      // Table might not exist
    }
    
    console.log('\n🎉 Import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Import failed!');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Please check:');
      console.log('   - MySQL service is running on Railway');
      console.log('   - Environment variables are correct');
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Access denied. Please check:');
      console.log('   - MYSQLUSER and MYSQLPASSWORD are correct');
    }
    
    process.exit(1);
    
  } finally {
    // Tutup koneksi
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Jalankan import
importDatabase()
  .then(() => {
    console.log('✅ Script finished successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
