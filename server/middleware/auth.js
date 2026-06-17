import { queryOne } from '../utils/dbHelper.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'footbath_management_secret_key_2025';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      store_id: user.store_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录，请先登录' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
};

export const getStoreFilter = (req, paramStoreId) => {
  const user = req.user;
  if (!user) {
    return { storeId: null, isHeadquarters: false };
  }

  if (user.role === 'headquarters') {
    return {
      storeId: paramStoreId || null,
      isHeadquarters: true
    };
  }

  return {
    storeId: user.store_id,
    isHeadquarters: false
  };
};

export const checkStorePermission = (req, targetStoreId) => {
  const user = req.user;
  if (!user) return false;
  if (user.role === 'headquarters') return true;
  return user.store_id === targetStoreId;
};

export const requireStorePermission = (req, res, targetStoreId) => {
  if (!checkStorePermission(req, targetStoreId)) {
    res.status(403).json({ success: false, message: '无权操作其他门店的数据' });
    return false;
  }
  return true;
};
