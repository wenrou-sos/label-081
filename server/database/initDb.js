import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL server');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema.sql...');
    await connection.query(schema);
    
    console.log('Database and tables created successfully!');
    
    const [rows] = await connection.query('SHOW DATABASES LIKE ?', ['footbath_management']);
    if (rows.length > 0) {
      console.log('Database "footbath_management" verified.');
      
      await connection.query('USE footbath_management');
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`Created ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    }
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
