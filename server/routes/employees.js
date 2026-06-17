import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { store_id, status, position, keyword } = req.query;
    let sql = `
      SELECT e.*, s.name as store_name 
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (store_id) {
      sql += ' AND e.store_id = ?';
      params.push(store_id);
    }
    if (status) {
      sql += ' AND e.status = ?';
      params.push(status);
    }
    if (position) {
      sql += ' AND e.position = ?';
      params.push(position);
    }
    if (keyword) {
      sql += ' AND (e.name LIKE ? OR e.emp_no LIKE ? OR e.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY e.id DESC';
    const employees = await query(sql, params);
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await queryOne(`
      SELECT e.*, s.name as store_name 
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.id = ?
    `, [req.params.id]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '员工不存在' });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { emp_no, name, phone, id_card, position, store_id, skilled_services, training_records, hire_date } = req.body;
    const result = await query(
      `INSERT INTO employees (emp_no, name, phone, id_card, position, store_id, skilled_services, training_records, hire_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [emp_no, name, phone, id_card, position, store_id, skilled_services || null, training_records || null, hire_date]
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, id_card, position, store_id, skilled_services, training_records } = req.body;
    await query(
      `UPDATE employees SET name = ?, phone = ?, id_card = ?, position = ?, store_id = ?, skilled_services = ?, training_records = ? 
       WHERE id = ?`,
      [name, phone, id_card, position, store_id, skilled_services, training_records, req.params.id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/resign', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await query(
      'UPDATE employees SET status = ?, resign_date = ? WHERE id = ?',
      ['resigned', today, req.params.id]
    );
    res.json({ success: true, message: '已办理离职' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/transfer', async (req, res) => {
  try {
    const { target_store_id, reason } = req.body;
    const employee = await queryOne('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!employee) {
      return res.status(404).json({ success: false, message: '员工不存在' });
    }
    if (employee.status !== 'active') {
      return res.status(400).json({ success: false, message: '该员工已离职，无法调动' });
    }
    let history = [];
    if (employee.transfer_history) {
      try {
        history = JSON.parse(employee.transfer_history);
      } catch (e) {
        history = [];
      }
    }
    history.push({
      from_store_id: employee.store_id,
      to_store_id: target_store_id,
      reason,
      transfer_date: new Date().toISOString()
    });
    await query(
      'UPDATE employees SET store_id = ?, transfer_history = ?, status = ? WHERE id = ?',
      [target_store_id, JSON.stringify(history), employee.status, req.params.id]
    );
    res.json({ success: true, message: '调动成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
