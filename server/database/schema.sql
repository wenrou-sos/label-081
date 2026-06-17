CREATE DATABASE IF NOT EXISTS footbath_management DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE footbath_management;

CREATE TABLE IF NOT EXISTS stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  manager VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration INT NOT NULL COMMENT '服务时长(分钟)',
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_levels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  min_recharge DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  benefits TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  card_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  level_id INT,
  balance DECIMAL(10,2) DEFAULT 0,
  total_recharge DECIMAL(10,2) DEFAULT 0,
  total_consume DECIMAL(10,2) DEFAULT 0,
  store_id INT COMMENT '办卡门店',
  status ENUM('active', 'frozen', 'cancelled') DEFAULT 'active',
  follow_up_status ENUM('pending', 'followed') DEFAULT 'pending',
  last_contact TIMESTAMP NULL,
  follow_up_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (level_id) REFERENCES member_levels(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  emp_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  id_card VARCHAR(20),
  position ENUM('technician', 'cashier', 'manager', 'other') DEFAULT 'technician',
  store_id INT NOT NULL,
  skilled_services TEXT COMMENT '擅长项目，逗号分隔',
  training_records TEXT COMMENT '培训考核记录，JSON格式',
  hire_date DATE,
  resign_date DATE,
  transfer_history TEXT COMMENT '调动历史，JSON格式',
  status ENUM('active', 'resigned', 'transferred') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_id INT NOT NULL,
  base_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(3,2) NOT NULL DEFAULT 0,
  tier_bonus TEXT COMMENT '阶梯提成JSON',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  store_id INT NOT NULL,
  member_id INT,
  service_id INT NOT NULL,
  employee_id INT COMMENT '服务技师',
  original_price DECIMAL(10,2) NOT NULL,
  actual_price DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) DEFAULT 0,
  payment_method ENUM('cash', 'card', 'member') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
  order_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS recharge_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  member_id INT NOT NULL,
  store_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  gift_amount DECIMAL(10,2) DEFAULT 0,
  payment_method ENUM('cash', 'card') NOT NULL,
  recharge_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  shift_name VARCHAR(50) NOT NULL COMMENT '早班/中班/晚班',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS shift_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  shift_id INT,
  report_date DATE NOT NULL,
  customer_count INT DEFAULT 0,
  cash_amount DECIMAL(10,2) DEFAULT 0,
  card_amount DECIMAL(10,2) DEFAULT 0,
  member_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  service_details TEXT COMMENT '各项目销售明细JSON',
  technician_details TEXT COMMENT '技师上钟明细JSON',
  handover_employee_id INT COMMENT '交班人',
  takeover_employee_id INT COMMENT '接班人',
  handover_signature TEXT COMMENT '交班人签字base64',
  takeover_signature TEXT COMMENT '接班人签字base64',
  status ENUM('draft', 'confirmed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('headquarters', 'store_manager', 'cashier') NOT NULL,
  store_id INT,
  employee_id INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

INSERT INTO member_levels (name, min_recharge, discount_rate, benefits) VALUES
('普通会员', 0, 1.00, '基础会员权益'),
('银卡会员', 1000, 0.95, '9.5折优惠，生日礼品'),
('金卡会员', 3000, 0.90, '9折优惠，生日礼品，专属技师预约'),
('钻石会员', 10000, 0.80, '8折优惠，VIP包厢，专属客服');

INSERT INTO stores (name, address, phone, manager, status) VALUES
('旗舰店', '北京市朝阳区建国路88号', '010-12345678', '张经理', 'active'),
('朝阳门店', '北京市东城区朝阳门内大街168号', '010-23456789', '李经理', 'active'),
('西单店', '北京市西城区西单北大街120号', '010-34567890', '王经理', 'active');

INSERT INTO services (name, description, duration, price, category, status) VALUES
('经典足疗', '传统足部按摩60分钟', 60, 128.00, '足疗', 'active'),
('泰式足疗', '泰式足部按摩75分钟', 75, 168.00, '足疗', 'active'),
('全身精油SPA', '全身精油按摩90分钟', 90, 298.00, 'SPA', 'active'),
('肩颈理疗', '肩颈专项调理60分钟', 60, 158.00, '理疗', 'active'),
('艾灸养生', '艾灸调理60分钟', 60, 98.00, '养生', 'active'),
('采耳', '专业采耳服务30分钟', 30, 68.00, '养生', 'active');

INSERT INTO commission_rules (service_id, base_commission, commission_rate) VALUES
(1, 20, 0.20),
(2, 28, 0.22),
(3, 60, 0.25),
(4, 26, 0.20),
(5, 16, 0.18),
(6, 12, 0.20);

INSERT INTO shifts (store_id, shift_name, start_time, end_time) VALUES
(1, '早班', '09:00:00', '17:00:00'),
(1, '中班', '14:00:00', '22:00:00'),
(1, '晚班', '18:00:00', '02:00:00'),
(2, '早班', '09:00:00', '17:00:00'),
(2, '中班', '14:00:00', '22:00:00'),
(2, '晚班', '18:00:00', '02:00:00'),
(3, '早班', '09:00:00', '17:00:00'),
(3, '中班', '14:00:00', '22:00:00'),
(3, '晚班', '18:00:00', '02:00:00');

INSERT INTO employees (emp_no, name, phone, position, store_id, skilled_services, hire_date, status) VALUES
('T001', '王技师', '13800138001', 'technician', 1, '1,2', '2023-01-15', 'active'),
('T002', '李技师', '13800138002', 'technician', 1, '3,4', '2023-03-20', 'active'),
('T003', '张技师', '13800138003', 'technician', 2, '1,5', '2023-02-10', 'active'),
('T004', '赵技师', '13800138004', 'technician', 2, '2,6', '2023-05-01', 'active'),
('T005', '陈技师', '13800138005', 'technician', 3, '3,5', '2023-04-15', 'active'),
('C001', '刘收银', '13800138006', 'cashier', 1, NULL, '2023-06-01', 'active'),
('C002', '孙收银', '13800138007', 'cashier', 2, NULL, '2023-06-15', 'active'),
('C003', '周收银', '13800138008', 'cashier', 3, NULL, '2023-07-01', 'active');

INSERT INTO users (username, password, role, store_id, employee_id, status) VALUES
('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'headquarters', NULL, NULL, 'active'),
('store1', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'store_manager', 1, NULL, 'active'),
('store2', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'store_manager', 2, NULL, 'active'),
('store3', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'store_manager', 3, NULL, 'active');

INSERT INTO members (card_no, name, phone, level_id, balance, total_recharge, total_consume, store_id, status) VALUES
('M00001', '张三', '13900139001', 2, 500.00, 1000.00, 500.00, 1, 'active'),
('M00002', '李四', '13900139002', 3, 1800.00, 3000.00, 1200.00, 1, 'active'),
('M00003', '王五', '13900139003', 4, 5000.00, 10000.00, 5000.00, 2, 'active'),
('M00004', '赵六', '13900139004', 1, 200.00, 200.00, 0.00, 2, 'active'),
('M00005', '孙七', '13900139005', 2, 800.00, 1000.00, 200.00, 3, 'active');
