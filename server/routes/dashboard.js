import { Router } from 'express';
import { query } from '../utils/dbHelper.js';

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = start_date || today;
    const end = end_date || today;

    const totalRevenue = await query(`
      SELECT COALESCE(SUM(actual_price), 0) as total
      FROM orders WHERE order_date BETWEEN ? AND ? AND status = 'completed'
    `, [start, end]);

    const totalRecharge = await query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM recharge_records WHERE recharge_date BETWEEN ? AND ?
    `, [start, end]);

    const storeRanking = await query(`
      SELECT s.id, s.name, COALESCE(SUM(o.actual_price), 0) as revenue
      FROM stores s
      LEFT JOIN orders o ON s.id = o.store_id AND o.order_date BETWEEN ? AND ? AND o.status = 'completed'
      GROUP BY s.id, s.name
      ORDER BY revenue DESC
    `, [start, end]);

    const serviceSales = await query(`
      SELECT sv.id, sv.name, sv.category, 
             COUNT(o.id) as count, 
             COALESCE(SUM(o.actual_price), 0) as amount
      FROM services sv
      LEFT JOIN orders o ON sv.id = o.service_id AND o.order_date BETWEEN ? AND ? AND o.status = 'completed'
      WHERE sv.status = 'active'
      GROUP BY sv.id, sv.name, sv.category
      ORDER BY amount DESC
    `, [start, end]);

    const paymentStats = await query(`
      SELECT payment_method, COALESCE(SUM(actual_price), 0) as amount, COUNT(*) as count
      FROM orders 
      WHERE order_date BETWEEN ? AND ? AND status = 'completed'
      GROUP BY payment_method
    `, [start, end]);

    const memberStats = await query(`
      SELECT 
        COUNT(*) as total_members,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(total_recharge), 0) as total_recharge_all
      FROM members WHERE status = 'active'
    `);

    res.json({
      success: true,
      data: {
        total_revenue: totalRevenue[0]?.total || 0,
        total_recharge: totalRecharge[0]?.total || 0,
        store_ranking: storeRanking,
        service_sales: serviceSales,
        payment_stats: paymentStats,
        member_stats: memberStats[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const n = parseInt(days);
    const trend = await query(`
      SELECT 
        order_date as date,
        COALESCE(SUM(actual_price), 0) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status = 'completed'
      GROUP BY order_date
      ORDER BY order_date
    `, [n]);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
