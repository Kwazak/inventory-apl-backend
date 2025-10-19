// Script to update database schema from manager to viewer
require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'factory_inventory',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

async function updateSchema() {
  try {
    console.log('=== UPDATING DATABASE SCHEMA ===\n');
    
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    console.log('Step 1: Checking current schema...');
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM users WHERE Field = 'role'
    `);
    console.log('Current role enum:', columns[0].Type);
    console.log('');

    console.log('Step 2: Adding "viewer" to ENUM temporarily...');
    await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'manager', 'staff', 'viewer') DEFAULT 'staff'
    `);
    console.log('✓ Added viewer to enum\n');

    console.log('Step 3: Converting manager role to viewer...');
    const [updateResult] = await sequelize.query(`
      UPDATE users 
      SET role = 'viewer' 
      WHERE role = 'manager'
    `);
    console.log(`✓ Updated ${updateResult.affectedRows} user(s)\n`);

    console.log('Step 4: Removing "manager" from ENUM...');
    await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'viewer', 'staff') DEFAULT 'staff'
    `);
    console.log('✓ Removed manager from enum\n');

    console.log('Step 5: Ensuring all 3 default users exist...');
    
    // Hash password: admin123
    const hashedPassword = '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM02N8W0PPvF.v8dn.1m';
    
    // Check and update/insert users
    const defaultUsers = [
      {
        username: 'admin',
        password: hashedPassword,
        full_name: 'Administrator',
        role: 'admin',
        email: 'admin@factory.com'
      },
      {
        username: 'viewer',
        password: hashedPassword,
        full_name: 'Dashboard Viewer',
        role: 'viewer',
        email: 'viewer@factory.com'
      },
      {
        username: 'operator1',
        password: hashedPassword,
        full_name: 'Operator Produksi',
        role: 'staff',
        email: 'operator@factory.com'
      }
    ];

    for (const user of defaultUsers) {
      const [existing] = await sequelize.query(`
        SELECT id FROM users WHERE username = ?
      `, { replacements: [user.username] });

      if (existing.length > 0) {
        // Update existing user
        await sequelize.query(`
          UPDATE users 
          SET full_name = ?, role = ?, email = ?, is_active = TRUE
          WHERE username = ?
        `, { 
          replacements: [user.full_name, user.role, user.email, user.username] 
        });
        console.log(`✓ Updated user: ${user.username} (role: ${user.role})`);
      } else {
        // Insert new user
        await sequelize.query(`
          INSERT INTO users (username, password, full_name, role, email, is_active)
          VALUES (?, ?, ?, ?, ?, TRUE)
        `, { 
          replacements: [user.username, user.password, user.full_name, user.role, user.email] 
        });
        console.log(`✓ Created user: ${user.username} (role: ${user.role})`);
      }
    }

    console.log('\nStep 6: Verifying final state...');
    const [finalUsers] = await sequelize.query(`
      SELECT username, full_name, role, email, is_active 
      FROM users 
      ORDER BY id
    `);
    
    console.log('\n=== FINAL USERS ===');
    finalUsers.forEach(u => {
      console.log(`${u.username.padEnd(15)} | ${u.full_name.padEnd(25)} | ${u.role.padEnd(10)} | ${u.email}`);
    });

    const [finalSchema] = await sequelize.query(`
      SHOW COLUMNS FROM users WHERE Field = 'role'
    `);
    console.log('\n=== FINAL SCHEMA ===');
    console.log('Role enum:', finalSchema[0].Type);

    console.log('\n✅ DATABASE UPDATE COMPLETE!');
    console.log('\nDefault credentials (all users):');
    console.log('Password: admin123');
    console.log('\nNext steps:');
    console.log('1. Restart backend server if running');
    console.log('2. Refresh frontend application');
    console.log('3. Login and check "Kelola Pengguna" page');

    await sequelize.close();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.original) {
      console.error('SQL Error:', error.original.sqlMessage);
    }
    process.exit(1);
  }
}

updateSchema();
