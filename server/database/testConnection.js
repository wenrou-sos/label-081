import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'footbath_management'
    });

    console.log('✅ Successfully connected to database "footbath_management"');

    const [rows] = await connection.query('SELECT COUNT(*) as count FROM stores');
    console.log(`📊 Stores in database: ${rows[0].count}`);

    const [services] = await connection.query('SELECT COUNT(*) as count FROM services');
    console.log(`📊 Services in database: ${services[0].count}`);

    const [members] = await connection.query('SELECT COUNT(*) as count FROM members');
    console.log(`📊 Members in database: ${members[0].count}`);

    const [employees] = await connection.query('SELECT COUNT(*) as count FROM employees');
    console.log(`📊 Employees in database: ${employees[0].count}`);

    console.log('\n🎉 Database connection test passed!');

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
