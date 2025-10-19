const { sequelize, User, Product, RawMaterial, Supplier, Customer, BOM } = require('./src/models');

async function verifyData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const users = await User.count();
    const products = await Product.count();
    const materials = await RawMaterial.count();
    const suppliers = await Supplier.count();
    const customers = await Customer.count();
    const bom = await BOM.count();

    console.log('\n📊 Database Summary:');
    console.log(`  👥 Users: ${users}`);
    console.log(`  🏭 Suppliers: ${suppliers}`);
    console.log(`  🛒 Customers: ${customers}`);
    console.log(`  📦 Raw Materials: ${materials}`);
    console.log(`  👟 Products: ${products}`);
    console.log(`  📋 BOM Entries: ${bom}`);
    console.log('\n✅ All data loaded successfully!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyData();
