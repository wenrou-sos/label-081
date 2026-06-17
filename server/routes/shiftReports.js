import { Router } from 'express';
import { query, queryOne } from '../utils/dbHelper.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { store_id, start_date, end_date } = req.query;
    let sql = `
      SELECT sr.*, s.name as store_name, sh.shift_name
      FROM shift_reports sr
      LEFT JOIN stores s ON sr.store_id = s.id
      LEFT JOIN shifts sh ON sr.shift_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    if (store_id) {
      sql += ' AND sr.store_id = ?';
      params.push(store_id);
    }
    if (start_date) {
      sql += ' AND sr.report_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND sr.report_date <= ?';
      params.push(end_date);
    }
    sql += ' ORDER BY sr.id DESC';
    const reports = await query(sql, params);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await queryOne(`
      SELECT sr.*, s.name as store_name, sh.shift_name,
             he.name as handover_name, te.name as takeover_name
      FROM shift_reports sr
      LEFT JOIN stores s ON sr.store_id = s.id
      LEFT JOIN shifts sh ON sr.shift_id = sh.id
      LEFT JOIN employees he ON sr.handover_employee_id = he.id
      LEFT JOIN employees te ON sr.takeover_employee_id = te.id
      WHERE sr.id = ?
    `, [req.params.id]);
    if (!report) {
      return res.status(404).json({ success: false, message: '交班报表不存在' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { store_id, shift_id, report_date, customer_count, cash_amount, card_amount, 
            member_amount, total_amount, service_details, technician_details,
            handover_employee_id, takeover_employee_id, handover_signature, takeover_signature } = req.body;
    
    const result = await query(
      `INSERT INTO shift_reports (store_id, shift_id, report_date, customer_count, 
        cash_amount, card_amount, member_amount, total_amount, service_details, 
        technician_details, handover_employee_id, takeover_employee_id, 
        handover_signature, takeover_signature, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [store_id, shift_id, report_date, customer_count, cash_amount, card_amount,
       member_amount, total_amount, service_details, technician_details,
       handover_employee_id, takeover_employee_id, handover_signature, takeover_signature]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const { handover_signature, takeover_signature } = req.body;
    const now = new Date();
    await query(
      `UPDATE shift_reports SET handover_signature = ?, takeover_signature = ?, 
        status = 'confirmed', confirmed_at = ? WHERE id = ?`,
      [handover_signature, takeover_signature, now, req.params.id]
    );
    res.json({ success: true, message: '交接班确认成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/generate/:store_id/:date/:shift_id', async (req, res) => {
  try {
    const { store_id, date, shift_id } = req.params;
    const shift = await queryOne('SELECT * FROM shifts WHERE id = ?', [shift_id]);
    
    const orders = await query(`
      SELECT o.*, sv.name as service_name, sv.category, e.name as employee_name
      FROM orders o
      LEFT JOIN services sv ON o.service_id = sv.id
      LEFT JOIN employees e ON o.employee_id = e.id
      WHERE o.store_id = ? AND o.order_date = ? AND o.status = 'completed'
    `, [store_id, date]);

    const customer_count = orders.length;
    let cash_amount = 0, card_amount = 0, member_amount = 0;
    const serviceMap = {};
    const techMap = {};

    orders.forEach(o => {
      if (o.payment_method === 'cash') cash_amount += Number(o.actual_price);
      else if (o.payment_method === 'card') card_amount += Number(o.actual_price);
      else if (o.payment_method === 'member') member_amount += Number(o.actual_price);

      const key = o.service_id + '_' + o.service_name;
      if (!serviceMap[key]) {
        serviceMap[key] = { service_id: o.service_id, service_name: o.service_name, count: 0, amount: 0, category: o.category };
      }
      serviceMap[key].count++;
      serviceMap[key].amount += Number(o.actual_price);

      if (o.employee_id) {
        const tkey = o.employee_id + '_' + o.employee_name;
        if (!techMap[tkey]) {
          techMap[tkey] = { employee_id: o.employee_id, employee_name: o.employee_name, count: 0, commission: 0 };
        }
        techMap[tkey].count++;
        techMap[tkey].commission += Number(o.commission);
      }
    });

    const total_amount = cash_amount + card_amount + member_amount;

    res.json({
      success: true,
      data: {
        store_id,
        shift_id,
        shift_name: shift?.shift_name,
        report_date: date,
        customer_count,
        cash_amount: cash_amount.toFixed(2),
        card_amount: card_amount.toFixed(2),
        member_amount: member_amount.toFixed(2),
        total_amount: total_amount.toFixed(2),
        service_details: Object.values(serviceMap),
        technician_details: Object.values(techMap)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/shifts/:store_id', async (req, res) => {
  try {
    const shifts = await query('SELECT * FROM shifts WHERE store_id = ? ORDER BY id', [req.params.store_id]);
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
