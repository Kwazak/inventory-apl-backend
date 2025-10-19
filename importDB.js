const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function importDatabase() {
  let connection;
  
  try {
    console.log('\n=================================');
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
    
    // Debug: Tampilkan info direktori dan file
    console.log('📂 Current directory:', __dirname);
    console.log('📂 Database folder exists?', fs.existsSync(path.join(__dirname, 'database')));
    
    // List semua file di folder database jika ada
    if (fs.existsSync(path.join(__dirname, 'database'))) {
      console.log('📂 Files in database folder:');
      fs.readdirSync(path.join(__dirname, 'database')).forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    }
    
    // Cek apakah tabel users sudah ada
    const [existingTables] = await connection.query("SHOW TABLES LIKE 'users'");
    
    if (existingTables.length > 0) {
      console.log('✅ Table "users" already exists, skipping import');
      
      // Verifikasi semua tabel yang ada
      const [tables] = await connection.query('SHOW TABLES');
      if (tables.length > 0) {
        console.log('\n📋 Existing tables:');
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
        console.log('⚠️  Could not count users:', err.message);
      }
      
      console.log('\n✅ Database already initialized, proceeding to server...\n');
      return;
    }
    
    // TABEL TIDAK ADA - MULAI IMPORT
    console.log('⚠️  Table "users" NOT FOUND!');
    console.log('🔄 Starting database import...\n');
    
    // Cari file schema.sql di berbagai lokasi
    const possiblePaths = [
      path.join(__dirname, 'database', 'schema.sql'),
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, 'sql', 'schema.sql'),
      path.join(__dirname, 'database.sql'),
      path.join(__dirname, 'init.sql')
    ];
    
    let sqlFilePath = null;
    let sqlContent = null;
    
    // Cari file SQL yang ada
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        sqlFilePath = possiblePath;
        console.log(`✅ Found SQL file at: ${sqlFilePath}`);
        sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        break;
      }
    }
    
    // Jika tidak ada file SQL ditemukan
    if (!sqlFilePath || !sqlContent) {
      console.error('\n❌ No SQL schema file found!');
      console.log('\n🔍 Searched in:');
      possiblePaths.forEach(p => console.log(`   - ${p}`));
      
      console.log('\n💡 Available files in root:');
      fs.readdirSync(__dirname)
        .filter(f => f.endsWith('.sql'))
        .forEach(f => console.log(`   - ${f}`));
      
      console.log('\n⚠️  Cannot create tables without schema file!');
      console.log('➡️  Server will start but database operations will fail!\n');
      return;
    }
    
    // Execute SQL
    console.log('📄 Reading SQL file:', sqlFilePath);
    console.log('⚡ Executing SQL statements...\n');
    
    try {
      await connection.query(sqlContent);
      console.log('✅ SQL executed successfully!\n');
    } catch (sqlError) {
      console.error('❌ SQL execution error:', sqlError.message);
      
      // Coba execute statement by statement jika gagal
      console.log('🔄 Trying to execute statements individually...\n');
      
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (let i = 0; i < statements.length; i++) {
        try {
          await connection.query(statements[i]);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (stmtError) {
          console.error(`✗ Statement ${i + 1} failed:`, stmtError.message);
        }
      }
    }
    
    // Verifikasi hasil import
    console.log('\n📊 Verifying import...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log('\n✅ Tables created successfully:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`   ✓ ${tableName}`);
      });
      
      // Cek struktur tabel users
      try {
        const [columns] = await connection.query('DESCRIBE users');
        console.log('\n📋 Table "users" structure:');
        columns.forEach(col => {
          console.log(`   - ${col.Field} (${col.Type})`);
        });
      } catch (err) {
        console.log('⚠️  Could not describe users table');
      }
      
      // Cek jumlah users
      try {
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`\n👥 Total users: ${users[0].count}`);
      } catch (err) {
        console.log('⚠️  Could not count users');
      }
      
      console.log('\n🎉 Database import completed successfully!\n');
    } else {
      console.log('\n⚠️  No tables were created!');
      console.log('❌ Import may have failed!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Import process failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Check:');
      console.log('   - MySQL service is running on Railway');
      console.log('   - Environment variables are correct');
      console.log('   - Network connectivity');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Access denied. Check:');
      console.log('   - MYSQLUSER is correct');
      console.log('   - MYSQLPASSWORD is correct');
      console.log('   - User has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database not found. Check:');
      console.log('   - MYSQLDATABASE name is correct');
      console.log('   - Database exists on Railway');
    }
    
    console.log('\n⚠️  Server will continue, but database may not work!\n');
    
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
    console.log('✅ Import script finished successfully');
  })
  .catch((error) => {
    console.error('⚠️  Import script encountered errors:', error.message);
    console.log('➡️  Continuing to server startup...\n');
  });
