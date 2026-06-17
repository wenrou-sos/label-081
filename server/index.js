import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import storesRouter from './routes/stores.js';
import servicesRouter from './routes/services.js';
import membersRouter from './routes/members.js';
import employeesRouter from './routes/employees.js';
import ordersRouter from './routes/orders.js';
import shiftReportsRouter from './routes/shiftReports.js';
import dashboardRouter from './routes/dashboard.js';
import inventoryRouter from './routes/inventory.js';
import employeePerformanceRouter from './routes/employeePerformance.js';
import authRouter from './routes/auth.js';
import { query } from './utils/dbHelper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '足浴管理平台API服务运行正常', timestamp: new Date().toISOString() });
});

app.get('/api/init-demo', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const demoOrders = [
      { store_id: 1, member_id: 1, service_id: 1, employee_id: 1, price: 128, payment: 'member' },
      { store_id: 1, member_id: null, service_id: 2, employee_id: 2, price: 168, payment: 'cash' },
      { store_id: 1, member_id: 2, service_id: 3, employee_id: 1, price: 298, payment: 'member' },
      { store_id: 1, member_id: null, service_id: 4, employee_id: 2, price: 158, payment: 'card' },
      { store_id: 2, member_id: 3, service_id: 1, employee_id: 3, price: 128, payment: 'member' },
      { store_id: 2, member_id: 4, service_id: 2, employee_id: 4, price: 168, payment: 'member' },
      { store_id: 2, member_id: null, service_id: 5, employee_id: 3, price: 98, payment: 'cash' },
      { store_id: 3, member_id: 5, service_id: 3, employee_id: 5, price: 298, payment: 'member' },
      { store_id: 3, member_id: null, service_id: 6, employee_id: 5, price: 68, payment: 'cash' },
      { store_id: 3, member_id: null, service_id: 1, employee_id: 5, price: 128, payment: 'card' },
    ];

    for (const d of demoOrders) {
      const orderNo = 'O' + Date.now() + Math.floor(Math.random() * 1000);
      let commission = 0;
      const rule = await query('SELECT * FROM commission_rules WHERE service_id = ?', [d.service_id]);
      if (rule.length > 0) {
        commission = Number(rule[0].base_commission) + (Number(d.price) * Number(rule[0].commission_rate));
      }
      await query(
        `INSERT INTO orders (order_no, store_id, member_id, service_id, employee_id, original_price, actual_price, commission, payment_method, order_date, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [orderNo, d.store_id, d.member_id, d.service_id, d.employee_id, d.price, d.price, commission, d.payment, today]
      );
      if (d.member_id && d.payment === 'member') {
        await query('UPDATE members SET balance = balance - ?, total_consume = total_consume + ? WHERE id = ?', [d.price, d.price, d.member_id]);
      }
    }
    res.json({ success: true, message: '演示数据已生成' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/stores', storesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/members', membersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shift-reports', shiftReportsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/employee-performance', employeePerformanceRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误', error: err.message });
});

app.listen(PORT, () => {
  console.log(`足浴管理平台API服务已启动: http://localhost:${PORT}`);
});
