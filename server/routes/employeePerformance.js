import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';
import { authMiddleware, getStoreFilter, requireStorePermission } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

router.get('/summary', async (req, res) => {
  try {
    const { store_id, period = 'month' } = req.query;
    const { storeId, isHeadquarters } = getStoreFilter(req, store_id);
    const { start, end } = getDateRange(period);

    let techSql = `
      SELECT COUNT(*) as total
      FROM employees
      WHERE position = 'technician' AND status = 'active'
    `;
    const techParams = [];
    if (storeId) {
      techSql += ' AND store_id = ?';
      techParams.push(storeId);
    }
    const techRow = await queryOne(techSql, techParams);
    const totalTechnicians = techRow?.total || 0;

    let orderSql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.actual_price), 0) as total_revenue,
        COALESCE(SUM(o.commission), 0) as total_commission
      FROM orders o
      WHERE o.order_date BETWEEN ? AND ?
        AND o.status = 'completed'
        AND o.employee_id IS NOT NULL
    `;
    const orderParams = [start, end];
    if (storeId) {
      orderSql += ' AND o.store_id = ?';
      orderParams.push(storeId);
    }
    const orderRow = await queryOne(orderSql, orderParams);

    const totalOrders = orderRow?.total_orders || 0;
    const totalCommission = Number(orderRow?.total_commission || 0);
    const avgCommission = totalTechnicians > 0 ? (totalCommission / totalTechnicians).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        total_technicians: totalTechnicians,
        total_orders,
        total_commission,
        avg_commission: Number(avgCommission),
        period,
        start_date: start,
        end_date: end
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/ranking', async (req, res) => {
  try {
    const { store_id, period = 'month', page = 1, page_size = 50 } = req.query;
    const { storeId, isHeadquarters } = getStoreFilter(req, store_id);
    const { start, end } = getDateRange(period);
    const pageNum = parseInt(page);
    const pageSize = parseInt(page_size);
    const offset = (pageNum - 1) * pageSize;

    let countSql = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM employees e
      WHERE e.position = 'technician' AND e.status = 'active'
    `;
    const countParams = [];
    if (storeId) {
      countSql += ' AND e.store_id = ?';
      countParams.push(storeId);
    }
    const countRow = await queryOne(countSql, countParams);
    const total = countRow?.total || 0;

    let listSql = `
      SELECT 
        e.id,
        e.name,
        e.emp_no,
        e.store_id,
        s.name as store_name,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.actual_price), 0) as total_revenue,
        COALESCE(SUM(o.commission), 0) as total_commission
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
      LEFT JOIN orders o ON e.id = o.employee_id 
        AND o.order_date BETWEEN ? AND ? 
        AND o.status = 'completed'
      WHERE e.position = 'technician' AND e.status = 'active'
    `;
    const listParams = [start, end];
    if (storeId) {
      listSql += ' AND e.store_id = ?';
      listParams.push(storeId);
    }
    listSql += ' GROUP BY e.id, e.name, e.emp_no, e.store_id, s.name';
    listSql += ' ORDER BY total_commission DESC LIMIT ? OFFSET ?';
    listParams.push(pageSize, offset);

    const list = await query(listSql, listParams);

    const techIds = list.map(item => item.id);
    let serviceDistribution = [];
    if (techIds.length > 0) {
      const placeholders = techIds.map(() => '?').join(',');
      const distSql = `
        SELECT 
          o.employee_id,
          sv.name as service_name,
          sv.category as service_category,
          COUNT(o.id) as count
        FROM orders o
        JOIN services sv ON o.service_id = sv.id
        WHERE o.employee_id IN (${placeholders})
          AND o.order_date BETWEEN ? AND ?
          AND o.status = 'completed'
        GROUP BY o.employee_id, sv.id, sv.name, sv.category
        ORDER BY o.employee_id, count DESC
      `;
      const distParams = [...techIds, start, end];
      serviceDistribution = await query(distSql, distParams);
    }

    const distMap = {};
    serviceDistribution.forEach(item => {
      if (!distMap[item.employee_id]) {
        distMap[item.employee_id] = [];
      }
      distMap[item.employee_id].push({
        name: item.service_name,
        category: item.service_category,
        count: item.count
      });
    });

    const result = list.map((item, index) => ({
      ...item,
      rank: offset + index + 1,
      total_revenue: Number(item.total_revenue),
      total_commission: Number(item.total_commission),
      service_distribution: distMap[item.id] || []
    }));

    res.json({
      success: true,
      data: {
        list: result,
        total,
        page: pageNum,
        page_size: pageSize,
        period,
        start_date: start,
        end_date: end
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await queryOne(`
      SELECT e.*, s.name as store_name
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.id = ?
    `, [id]);

    if (!employee) {
      return res.status(404).json({ success: false, message: '员工不存在' });
    }

    if (!requireStorePermission(req, res, employee.store_id)) {
      return;
    }

    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = d.toISOString().split('T')[0];
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        start: monthStart,
        end: monthEnd,
        label: `${d.getMonth() + 1}月`
      });
    }

    const monthlyStats = [];
    for (const m of months) {
      const row = await queryOne(`
        SELECT 
          COUNT(*) as order_count,
          COALESCE(SUM(actual_price), 0) as total_revenue,
          COALESCE(SUM(commission), 0) as total_commission
        FROM orders
        WHERE employee_id = ?
          AND order_date BETWEEN ? AND ?
          AND status = 'completed'
      `, [id, m.start, m.end]);

      monthlyStats.push({
        month: m.month,
        label: m.label,
        order_count: row?.order_count || 0,
        total_revenue: Number(row?.total_revenue || 0),
        total_commission: Number(row?.total_commission || 0)
      });
    }

    const currentMonth = months[months.length - 1];
    const serviceStats = await query(`
      SELECT 
        sv.id,
        sv.name,
        sv.category,
        COUNT(o.id) as count,
        COALESCE(SUM(o.actual_price), 0) as revenue,
        COALESCE(SUM(o.commission), 0) as commission
      FROM orders o
      JOIN services sv ON o.service_id = sv.id
      WHERE o.employee_id = ?
        AND o.order_date BETWEEN ? AND ?
        AND o.status = 'completed'
      GROUP BY sv.id, sv.name, sv.category
      ORDER BY count DESC
    `, [id, currentMonth.start, currentMonth.end]);

    const totalOrders = monthlyStats.reduce((sum, m) => sum + m.order_count, 0);
    const totalCommission = monthlyStats.reduce((sum, m) => sum + m.total_commission, 0);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          name: employee.name,
          emp_no: employee.emp_no,
          store_id: employee.store_id,
          store_name: employee.store_name,
          position: employee.position
        },
        monthly_stats: monthlyStats,
        service_stats: serviceStats.map(s => ({
          ...s,
          revenue: Number(s.revenue),
          commission: Number(s.commission)
        })),
        summary: {
          total_orders_6m: totalOrders,
          total_commission_6m: Number(totalCommission.toFixed(2)),
          avg_monthly_commission: Number((totalCommission / 6).toFixed(2))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/export/csv', async (req, res) => {
  try {
    const { store_id, period = 'month' } = req.query;
    const { storeId, isHeadquarters } = getStoreFilter(req, store_id);
    const { start, end } = getDateRange(period);

    let listSql = `
      SELECT 
        e.id,
        e.name,
        e.emp_no,
        s.name as store_name,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.actual_price), 0) as total_revenue,
        COALESCE(SUM(o.commission), 0) as total_commission
      FROM employees e
      LEFT JOIN stores s ON e.store_id = s.id
      LEFT JOIN orders o ON e.id = o.employee_id 
        AND o.order_date BETWEEN ? AND ? 
        AND o.status = 'completed'
      WHERE e.position = 'technician' AND e.status = 'active'
    `;
    const listParams = [start, end];
    if (storeId) {
      listSql += ' AND e.store_id = ?';
      listParams.push(storeId);
    }
    listSql += ' GROUP BY e.id, e.name, e.emp_no, s.name';
    listSql += ' ORDER BY total_commission DESC';

    const list = await query(listSql, listParams);

    const techIds = list.map(item => item.id);
    let serviceDistribution = [];
    if (techIds.length > 0) {
      const placeholders = techIds.map(() => '?').join(',');
      const distSql = `
        SELECT 
          o.employee_id,
          sv.name as service_name,
          COUNT(o.id) as count
        FROM orders o
        JOIN services sv ON o.service_id = sv.id
        WHERE o.employee_id IN (${placeholders})
          AND o.order_date BETWEEN ? AND ?
          AND o.status = 'completed'
        GROUP BY o.employee_id, sv.id, sv.name
        ORDER BY o.employee_id, count DESC
      `;
      const distParams = [...techIds, start, end];
      serviceDistribution = await query(distSql, distParams);
    }

    const distMap = {};
    serviceDistribution.forEach(item => {
      if (!distMap[item.employee_id]) {
        distMap[item.employee_id] = [];
      }
      distMap[item.employee_id].push(`${item.service_name}(${item.count}次)`);
    });

    const headers = ['排名', '技师姓名', '工号', '所属门店', '上钟次数', '总营业额', '提成金额', '服务项目分布'];
    const rows = list.map((item, index) => [
      index + 1,
      item.name,
      item.emp_no,
      item.store_name,
      item.order_count,
      Number(item.total_revenue).toFixed(2),
      Number(item.total_commission).toFixed(2),
      (distMap[item.id] || []).join('、')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const filename = `技师业绩排行_${period}_${start}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
