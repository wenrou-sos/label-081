import { Router } from 'express';
import { queryOne } from '../utils/dbHelper.js';
import bcrypt from 'bcrypt';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const user = await queryOne(`
      SELECT u.*, s.name as store_name
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.username = ? AND u.status = 'active'
    `, [username]);

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          store_id: user.store_id,
          store_name: user.store_name,
          role_name: {
            headquarters: '总部管理员',
            store_manager: '门店经理',
            cashier: '收银员'
          }[user.role] || user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne(`
      SELECT u.*, s.name as store_name
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.id = ? AND u.status = 'active'
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        store_id: user.store_id,
        store_name: user.store_name,
        role_name: {
          headquarters: '总部管理员',
          store_manager: '门店经理',
          cashier: '收银员'
        }[user.role] || user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '已退出登录' });
});

export default router;
