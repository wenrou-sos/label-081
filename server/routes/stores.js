import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const stores = await query('SELECT * FROM stores ORDER BY id');
    res.json({ success: true, data: stores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const store = await queryOne('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    if (!store) {
      return res.status(404).json({ success: false, message: '门店不存在' });
    }
    res.json({ success: true, data: store });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, address, phone, manager, status } = req.body;
    const result = await query(
      'INSERT INTO stores (name, address, phone, manager, status) VALUES (?, ?, ?, ?, ?)',
      [name, address, phone, manager, status || 'active']
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, address, phone, manager, status } = req.body;
    await query(
      'UPDATE stores SET name = ?, address = ?, phone = ?, manager = ?, status = ? WHERE id = ?',
      [name, address, phone, manager, status, req.params.id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('UPDATE stores SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    res.json({ success: true, message: '已禁用' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
