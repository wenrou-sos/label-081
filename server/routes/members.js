import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/next-card-no', async (req, res) => {
  try {
    const row = await queryOne(
      "SELECT MAX(CAST(SUBSTRING(card_no, 2) AS UNSIGNED)) as max_no FROM members WHERE card_no LIKE 'M%'"
    );
    const nextNo = (row?.max_no || 0) + 1;
    res.json({ success: true, data: { card_no: 'M' + String(nextNo).padStart(5, '0') } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/levels', async (req, res) => {
  try {
    const levels = await query('SELECT * FROM member_levels ORDER BY min_recharge');
    res.json({ success: true, data: levels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/levels', async (req, res) => {
  try {
    const { name, min_recharge, discount_rate, benefits } = req.body;
    const result = await query(
      'INSERT INTO member_levels (name, min_recharge, discount_rate, benefits) VALUES (?, ?, ?, ?)',
      [name, min_recharge, discount_rate, benefits]
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/levels/:id', async (req, res) => {
  try {
    const { name, min_recharge, discount_rate, benefits } = req.body;
    await query(
      'UPDATE member_levels SET name = ?, min_recharge = ?, discount_rate = ?, benefits = ? WHERE id = ?',
      [name, min_recharge, discount_rate, benefits, req.params.id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { store_id, keyword } = req.query;
    let sql = `
      SELECT m.*, ml.name as level_name, ml.discount_rate, s.name as store_name
      FROM members m
      LEFT JOIN member_levels ml ON m.level_id = ml.id
      LEFT JOIN stores s ON m.store_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (store_id) {
      sql += ' AND m.store_id = ?';
      params.push(store_id);
    }
    if (keyword) {
      sql += ' AND (m.name LIKE ? OR m.phone LIKE ? OR m.card_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY m.id DESC';
    const members = await query(sql, params);
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const member = await queryOne(`
      SELECT m.*, ml.name as level_name, ml.discount_rate, s.name as store_name
      FROM members m
      LEFT JOIN member_levels ml ON m.level_id = ml.id
      LEFT JOIN stores s ON m.store_id = s.id
      WHERE m.id = ?
    `, [req.params.id]);
    if (!member) {
      return res.status(404).json({ success: false, message: '会员不存在' });
    }
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { card_no, name, phone, level_id, store_id, balance, status } = req.body;
    const result = await query(
      'INSERT INTO members (card_no, name, phone, level_id, store_id, balance, total_recharge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [card_no, name, phone, level_id, store_id, balance || 0, balance || 0, status || 'active']
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/recharge', async (req, res) => {
  try {
    const { member_id, store_id, amount, gift_amount = 0, payment_method } = req.body;
    await query(
      'UPDATE members SET balance = balance + ?, total_recharge = total_recharge + ? WHERE id = ?',
      [Number(amount) + Number(gift_amount), amount, member_id]
    );
    const member = await queryOne('SELECT balance, total_recharge FROM members WHERE id = ?', [member_id]);
    const today = new Date().toISOString().split('T')[0];
    await query(
      'INSERT INTO recharge_records (member_id, store_id, amount, gift_amount, payment_method, recharge_date) VALUES (?, ?, ?, ?, ?, ?)',
      [member_id, store_id, amount, gift_amount, payment_method, today]
    );
    if (member) {
      const newLevel = await queryOne(
        'SELECT id FROM member_levels WHERE min_recharge <= ? ORDER BY min_recharge DESC LIMIT 1',
        [member.total_recharge]
      );
      if (newLevel) {
        await query('UPDATE members SET level_id = ? WHERE id = ?', [newLevel.id, member_id]);
      }
    }
    res.json({ success: true, message: '充值成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
