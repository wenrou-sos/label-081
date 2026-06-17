import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { store_id, start_date, end_date, payment_method } = req.query;
    let sql = `
      SELECT o.*, s.name as store_name, sv.name as service_name, 
             e.name as employee_name, m.name as member_name, m.card_no
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN services sv ON o.service_id = sv.id
      LEFT JOIN employees e ON o.employee_id = e.id
      LEFT JOIN members m ON o.member_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (store_id) {
      sql += ' AND o.store_id = ?';
      params.push(store_id);
    }
    if (start_date) {
      sql += ' AND o.order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND o.order_date <= ?';
      params.push(end_date);
    }
    if (payment_method) {
      sql += ' AND o.payment_method = ?';
      params.push(payment_method);
    }
    sql += ' ORDER BY o.id DESC LIMIT 500';
    const orders = await query(sql, params);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { store_id, member_id, service_id, employee_id, original_price, actual_price, payment_method } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const orderNo = 'O' + Date.now();
    
    let commission = 0;
    const rule = await queryOne('SELECT * FROM commission_rules WHERE service_id = ?', [service_id]);
    if (rule) {
      commission = Number(rule.base_commission) + (Number(actual_price) * Number(rule.commission_rate));
    }
    
    const result = await query(
      `INSERT INTO orders (order_no, store_id, member_id, service_id, employee_id, 
        original_price, actual_price, commission, payment_method, order_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [orderNo, store_id, member_id, service_id, employee_id, original_price, actual_price, commission, payment_method, today]
    );

    if (member_id && payment_method === 'member') {
      await query(
        'UPDATE members SET balance = balance - ?, total_consume = total_consume + ? WHERE id = ?',
        [actual_price, actual_price, member_id]
      );
    }

    res.json({ success: true, data: { id: result.insertId, order_no: orderNo } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
