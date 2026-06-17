import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const services = await query(`
      SELECT s.*, 
        cr.base_commission, 
        cr.commission_rate
      FROM services s
      LEFT JOIN commission_rules cr ON s.id = cr.service_id
      ORDER BY s.id
    `);
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const service = await queryOne(`
      SELECT s.*, 
        cr.base_commission, 
        cr.commission_rate,
        cr.tier_bonus
      FROM services s
      LEFT JOIN commission_rules cr ON s.id = cr.service_id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!service) {
      return res.status(404).json({ success: false, message: '服务项目不存在' });
    }
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, duration, price, category, status, base_commission, commission_rate } = req.body;
    const result = await query(
      'INSERT INTO services (name, description, duration, price, category, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, duration, price, category, status || 'active']
    );
    const serviceId = result.insertId;
    await query(
      'INSERT INTO commission_rules (service_id, base_commission, commission_rate) VALUES (?, ?, ?)',
      [serviceId, base_commission || 0, commission_rate || 0]
    );
    res.json({ success: true, data: { id: serviceId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, duration, price, category, status, base_commission, commission_rate } = req.body;
    await query(
      'UPDATE services SET name = ?, description = ?, duration = ?, price = ?, category = ?, status = ? WHERE id = ?',
      [name, description, duration, price, category, status, req.params.id]
    );
    const existing = await queryOne('SELECT id FROM commission_rules WHERE service_id = ?', [req.params.id]);
    if (existing) {
      await query(
        'UPDATE commission_rules SET base_commission = ?, commission_rate = ? WHERE service_id = ?',
        [base_commission, commission_rate, req.params.id]
      );
    } else {
      await query(
        'INSERT INTO commission_rules (service_id, base_commission, commission_rate) VALUES (?, ?, ?)',
        [req.params.id, base_commission || 0, commission_rate || 0]
      );
    }
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE services SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    res.json({ success: true, message: '已禁用' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
