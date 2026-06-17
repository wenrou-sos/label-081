import pool from '../config/db.js';

export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};
