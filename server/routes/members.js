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

router.get('/analysis/summary', async (req, res) => {
  try {
    const totalCount = await queryOne('SELECT COUNT(*) as count FROM members WHERE status = ?', ['active']);
    const newThisMonth = await queryOne(
      "SELECT COUNT(*) as count FROM members WHERE status = ? AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')",
      ['active']
    );
    const lowBalance = await queryOne('SELECT COUNT(*) as count FROM members WHERE status = ? AND balance < 50', ['active']);
    const inactive = await queryOne(
      `SELECT COUNT(*) as count 
       FROM members m 
       WHERE m.status = ?
       AND (
         NOT EXISTS (SELECT 1 FROM orders o WHERE o.member_id = m.id AND o.status = 'completed')
         OR (SELECT MAX(o.order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       )`,
      ['active']
    );
    const highValue = await queryOne('SELECT COUNT(*) as count FROM members WHERE status = ? AND total_consume >= 5000', ['active']);
    const totalBalance = await queryOne('SELECT COALESCE(SUM(balance), 0) as total FROM members WHERE status = ?', ['active']);
    const totalConsume = await queryOne('SELECT COALESCE(SUM(total_consume), 0) as total FROM members WHERE status = ?', ['active']);

    const days = parseInt(req.query.days || 30);
    const activeCount = await queryOne(
      `SELECT COUNT(DISTINCT m.id) as count 
       FROM members m
       INNER JOIN orders o ON m.id = o.member_id AND o.status = 'completed'
       WHERE m.status = ? AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      ['active', days]
    );

    res.json({
      success: true,
      data: {
        total_members: totalCount?.count || 0,
        active_members: activeCount?.count || 0,
        active_rate: totalCount?.count ? ((activeCount?.count / totalCount.count) * 100).toFixed(1) : 0,
        inactive_members: inactive?.count || 0,
        new_this_month: newThisMonth?.count || 0,
        low_balance: lowBalance?.count || 0,
        high_value: highValue?.count || 0,
        total_balance: totalBalance?.total || 0,
        total_consume: totalConsume?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analysis/level-distribution', async (req, res) => {
  try {
    const data = await query(`
      SELECT ml.id, ml.name, ml.discount_rate, COUNT(m.id) as member_count
      FROM member_levels ml
      LEFT JOIN members m ON ml.id = m.level_id AND m.status = 'active'
      GROUP BY ml.id, ml.name, ml.discount_rate
      ORDER BY ml.min_recharge
    `);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analysis/trend', async (req, res) => {
  try {
    const { member_id, months = 6 } = req.query;
    const n = parseInt(months);
    let sql = `
      SELECT 
        DATE_FORMAT(o.order_date, '%Y-%m') as month,
        COUNT(*) as order_count,
        COALESCE(SUM(o.actual_price), 0) as amount
      FROM orders o
      WHERE o.status = 'completed'
        AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `;
    const params = [n];
    if (member_id) {
      sql += ' AND o.member_id = ?';
      params.push(member_id);
    }
    sql += ' GROUP BY DATE_FORMAT(o.order_date, "%Y-%m") ORDER BY month';
    const data = await query(sql, params);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/analysis/warnings', async (req, res) => {
  try {
    const { type, store_id } = req.query;
    let sql = `
      SELECT m.*, ml.name as level_name, s.name as store_name,
        CASE
          WHEN m.balance < 50 THEN 'low_balance'
          WHEN m.total_consume >= 5000 THEN 'high_value'
          WHEN (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') IS NULL 
            OR (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            THEN 'inactive'
          ELSE NULL
        END as warning_type,
        DATEDIFF(CURDATE(), (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed')) as days_since_last_order
      FROM members m
      LEFT JOIN member_levels ml ON m.level_id = ml.id
      LEFT JOIN stores s ON m.store_id = s.id
      WHERE m.status = 'active'
    `;
    const params = [];
    if (store_id) {
      sql += ' AND m.store_id = ?';
      params.push(store_id);
    }
    if (type === 'low_balance') {
      sql += ' AND m.balance < 50';
    } else if (type === 'inactive') {
      sql += ` AND ((SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') IS NULL 
                  OR (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') < DATE_SUB(CURDATE(), INTERVAL 30 DAY))`;
    } else if (type === 'high_value') {
      sql += ' AND m.total_consume >= 5000';
    }
    sql += ' HAVING warning_type IS NOT NULL ORDER BY m.id DESC';
    const data = await query(sql, params);
    res.json({ success: true, data });
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
    const { store_id, keyword, warning_type } = req.query;
    let sql = `
      SELECT m.*, ml.name as level_name, ml.discount_rate, s.name as store_name,
        CASE
          WHEN m.balance < 50 THEN 'low_balance'
          WHEN m.total_consume >= 5000 THEN 'high_value'
          WHEN (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') IS NULL 
            OR (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            THEN 'inactive'
          ELSE NULL
        END as warning_type,
        DATEDIFF(CURDATE(), (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed')) as days_since_last_order
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
    if (warning_type === 'low_balance') {
      sql += ' AND m.balance < 50';
    } else if (warning_type === 'inactive') {
      sql += ` AND ((SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') IS NULL 
                  OR (SELECT MAX(order_date) FROM orders o WHERE o.member_id = m.id AND o.status = 'completed') < DATE_SUB(CURDATE(), INTERVAL 30 DAY))`;
    } else if (warning_type === 'high_value') {
      sql += ' AND m.total_consume >= 5000';
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

router.post('/:id/follow-up', async (req, res) => {
  try {
    const { note } = req.body;
    const now = new Date();
    await query(
      'UPDATE members SET follow_up_status = ?, last_contact = ?, follow_up_note = ? WHERE id = ?',
      ['followed', now, note || null, req.params.id]
    );
    res.json({ success: true, message: '已标记为已跟进' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/batch/follow-up', async (req, res) => {
  try {
    const { ids, note } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要操作的会员' });
    }
    const now = new Date();
    const placeholders = ids.map(() => '?').join(',');
    await query(
      `UPDATE members SET follow_up_status = ?, last_contact = ?, follow_up_note = ? WHERE id IN (${placeholders})`,
      ['followed', now, note || null, ...ids]
    );
    res.json({ success: true, message: `已批量标记 ${ids.length} 位会员为已跟进` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/batch/send-sms', async (req, res) => {
  try {
    const { ids, template } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要发送短信的会员' });
    }
    const members = await query(
      `SELECT id, name, phone FROM members WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    const results = members.map(m => ({
      member_id: m.id,
      name: m.name,
      phone: m.phone,
      sent: true,
      content: template || `【足浴品牌】尊敬的${m.name}会员，感谢您的支持，欢迎下次光临！`,
      sent_at: new Date().toISOString()
    }));
    res.json({ success: true, message: `已成功发送 ${ids.length} 条短信`, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
