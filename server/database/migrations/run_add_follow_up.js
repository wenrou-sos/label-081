import pool from '../../config/db.js';

async function runMigration() {
  try {
    console.log('Running migration: add follow_up fields to members table...');

    const [rows] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'members' 
      AND COLUMN_NAME = 'follow_up_status'
    `);

    if (rows.length > 0) {
      console.log('✅ Columns already exist, skipping migration');
      process.exit(0);
    }

    await pool.execute(`
      ALTER TABLE members
      ADD COLUMN follow_up_status ENUM('pending', 'followed') DEFAULT 'pending',
      ADD COLUMN last_contact TIMESTAMP NULL,
      ADD COLUMN follow_up_note TEXT
    `);

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Columns already exist');
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigration();
