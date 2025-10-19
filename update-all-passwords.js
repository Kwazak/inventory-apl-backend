// Update all users to have the same correct password hash
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'factory_inventory',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

async function updateAllPasswords() {
  try {
    console.log('=== UPDATING ALL USER PASSWORDS ===\n');
    
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Generate new hash for password: admin123
    console.log('Generating new password hash for "admin123"...');
    const newHash = await bcrypt.hash('admin123', 10);
    console.log(`✓ New hash generated: ${newHash}\n`);
    
    // Get all users first
    const [users] = await sequelize.query(`
      SELECT id, username, role FROM users ORDER BY id
    `);

    console.log(`Found ${users.length} users to update:\n`);
    users.forEach(user => {
      console.log(`  - ${user.username.padEnd(12)} | ${user.role}`);
    });

    // Update all users with new hash
    console.log('\nUpdating all users with new password hash...');
    const [result] = await sequelize.query(`
      UPDATE users 
      SET password = ?
    `, { replacements: [newHash] });

    console.log(`✓ Updated ${result.affectedRows} user(s)\n`);

    // Verify
    console.log('Verifying all users have the same hash...');
    const [updatedUsers] = await sequelize.query(`
      SELECT username, password, role 
      FROM users 
      ORDER BY id
    `);

    console.log('\n=== VERIFICATION ===');
    const uniqueHashes = new Set();
    updatedUsers.forEach(user => {
      uniqueHashes.add(user.password);
      console.log(`✓ ${user.username.padEnd(12)} | ${user.role.padEnd(10)} | Hash: ${user.password.substring(0, 25)}...`);
    });

    if (uniqueHashes.size === 1) {
      console.log(`\n✅ SUCCESS! All ${updatedUsers.length} users have the SAME password hash`);
    } else {
      console.log(`\n⚠️  WARNING: Found ${uniqueHashes.size} different password hashes!`);
    }

    console.log('\n📝 All user credentials:');
    console.log('Password for ALL users: admin123\n');
    updatedUsers.forEach(user => {
      console.log(`  Username: ${user.username.padEnd(12)} | Password: admin123 | Role: ${user.role}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

updateAllPasswords();
