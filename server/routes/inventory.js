import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';
import { authMiddleware, getStoreFilter, requireStorePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, category, low_stock_only, store_id } = req.query;
    const { storeId, isHeadquarters } = getStoreFilter(req, store_id);

    let sql = `
      SELECT i.*, s.name as store_name
      FROM inventory i
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.status = 'active'
    `;
    const params = [];

    if (storeId) {
      sql += ' AND i.store_id = ?';
      params.push(storeId);
    }

    if (keyword) {
      sql += ' AND i.name LIKE ?';
      params.push(`%${keyword}%`);
    }
    if (category) {
      sql += ' AND i.category = ?';
      params.push(category);
    }
    if (low_stock_only === 'true' || low_stock_only === '1') {
      sql += ' AND i.quantity <= i.min_stock';
    }
    sql += ' ORDER BY i.store_id, i.category, i.name';
    const data = await query(sql, params);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { store_id } = req.query;
    const { storeId } = getStoreFilter(req, store_id);

    let sql = 'SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL AND category != "" AND status = ?';
    const params = ['active'];

    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }
    sql += ' ORDER BY category';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { store_id } = req.query;
    const { storeId } = getStoreFilter(req, store_id);

    let sql = 'SELECT COUNT(*) as total_items, SUM(quantity) as total_qty FROM inventory WHERE status = ?';
    const params = ['active'];
    if (storeId) {
      sql += ' AND store_id = ?';
      params.push(storeId);
    }
    const totalRow = await queryOne(sql, params);

    let lowSql = 'SELECT COUNT(*) as low_count FROM inventory WHERE status = ? AND quantity <= min_stock';
    const lowParams = ['active'];
    if (storeId) {
      lowSql += ' AND store_id = ?';
      lowParams.push(storeId);
    }
    const lowRow = await queryOne(lowSql, lowParams);

    res.json({
      success: true,
      data: {
        total_items: totalRow?.total_items || 0,
        total_quantity: totalRow?.total_qty || 0,
        low_stock_count: lowRow?.low_count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await queryOne(`
      SELECT i.*, s.name as store_name
      FROM inventory i
      LEFT JOIN stores s ON i.store_id = s.id
      WHERE i.id = ?
    `, [req.params.id]);
    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, item.store_id)) {
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { store_id, name, unit, quantity, min_stock, category, remark } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: '物品名称不能为空' });
    }

    const { storeId, isHeadquarters } = getStoreFilter(req, store_id);
    if (!storeId) {
      return res.status(400).json({ success: false, message: '请选择门店' });
    }

    if (!requireStorePermission(req, res, storeId)) {
      return;
    }

    const result = await query(
      `INSERT INTO inventory (store_id, name, unit, quantity, min_stock, category, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [storeId, name, unit || '瓶', quantity || 0, min_stock || 0, category || null, remark || null]
    );
    const item = await queryOne('SELECT * FROM inventory WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该门店已有同名物品' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existingItem = await queryOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!existingItem) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, existingItem.store_id)) {
      return;
    }

    const { name, unit, min_stock, category, remark } = req.body;
    await query(
      `UPDATE inventory SET name = ?, unit = ?, min_stock = ?, category = ?, remark = ? WHERE id = ?`,
      [name, unit || '瓶', min_stock || 0, category || null, remark || null, req.params.id]
    );
    const item = await queryOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该门店已有同名物品' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existingItem = await queryOne('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!existingItem) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, existingItem.store_id)) {
      return;
    }

    await query('UPDATE inventory SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/stock-in', async (req, res) => {
  try {
    const { item_id, quantity, operator, remark } = req.body;
    if (!item_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: '请选择物品并填写入库数量' });
    }
    const item = await queryOne('SELECT * FROM inventory WHERE id = ? AND status = ?', [item_id, 'active']);
    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, item.store_id)) {
      return;
    }

    const beforeQty = Number(item.quantity);
    const afterQty = beforeQty + Number(quantity);

    await query('UPDATE inventory SET quantity = ? WHERE id = ?', [afterQty, item_id]);
    await query(
      `INSERT INTO inventory_records (store_id, item_id, type, quantity, before_quantity, after_quantity, operator, remark)
       VALUES (?, ?, 'stock_in', ?, ?, ?, ?, ?)`,
      [item.store_id, item_id, quantity, beforeQty, afterQty, operator || null, remark || null]
    );

    const updated = await queryOne('SELECT * FROM inventory WHERE id = ?', [item_id]);
    res.json({ success: true, data: updated, message: '入库成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/stock-out', async (req, res) => {
  try {
    const { item_id, quantity, operator, remark } = req.body;
    if (!item_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: '请选择物品并填写出库数量' });
    }
    const item = await queryOne('SELECT * FROM inventory WHERE id = ? AND status = ?', [item_id, 'active']);
    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, item.store_id)) {
      return;
    }

    const beforeQty = Number(item.quantity);
    if (beforeQty < Number(quantity)) {
      return res.status(400).json({ success: false, message: '库存不足，无法出库' });
    }
    const afterQty = beforeQty - Number(quantity);

    await query('UPDATE inventory SET quantity = ? WHERE id = ?', [afterQty, item_id]);
    await query(
      `INSERT INTO inventory_records (store_id, item_id, type, quantity, before_quantity, after_quantity, operator, remark)
       VALUES (?, ?, 'stock_out', ?, ?, ?, ?, ?)`,
      [item.store_id, item_id, quantity, beforeQty, afterQty, operator || null, remark || null]
    );

    const updated = await queryOne('SELECT * FROM inventory WHERE id = ?', [item_id]);
    res.json({ success: true, data: updated, message: '出库成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:itemId/records', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { type, page = 1, page_size = 20 } = req.query;
    const pageNum = parseInt(page);
    const pageSize = parseInt(page_size);
    const offset = (pageNum - 1) * pageSize;

    const item = await queryOne('SELECT * FROM inventory WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    if (!requireStorePermission(req, res, item.store_id)) {
      return;
    }

    let countSql = 'SELECT COUNT(*) as total FROM inventory_records WHERE item_id = ?';
    let sql = `
      SELECT r.*, i.name as item_name, i.unit
      FROM inventory_records r
      LEFT JOIN inventory i ON r.item_id = i.id
      WHERE r.item_id = ?
    `;
    const params = [itemId];
    const countParams = [itemId];

    if (type) {
      sql += ' AND r.type = ?';
      countSql += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }
    sql += ' ORDER BY r.id DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [records, countRow] = await Promise.all([
      query(sql, params),
      queryOne(countSql, countParams)
    ]);

    res.json({
      success: true,
      data: {
        list: records,
        total: countRow?.total || 0,
        page: pageNum,
        page_size: pageSize
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
