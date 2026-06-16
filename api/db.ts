import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'facility_repair.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('elevator', 'streetlight', 'fitness', 'access', 'other')),
      location TEXT NOT NULL,
      qr_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'worker' CHECK(role IN ('admin', 'worker')),
      password TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS repair_orders (
      id TEXT PRIMARY KEY,
      facility_id TEXT NOT NULL,
      facility_name TEXT NOT NULL,
      fault_type TEXT NOT NULL,
      description TEXT,
      photo_before TEXT,
      photo_after TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'repairing', 'completed')),
      reporter_name TEXT,
      reporter_phone TEXT,
      assignee_id TEXT,
      assignee_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (facility_id) REFERENCES facilities(id),
      FOREIGN KEY (assignee_id) REFERENCES workers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_facility ON repair_orders(facility_id);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_assignee ON repair_orders(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_created ON repair_orders(created_at);
  `);

  const workerCount = db.prepare('SELECT COUNT(*) as count FROM workers').get() as { count: number };
  if (workerCount.count === 0) {
    const saltRounds = 10;
    const hashedAdminPwd = bcrypt.hashSync('admin123', saltRounds);
    const hashedWorkerPwd = bcrypt.hashSync('123456', saltRounds);

    const insertWorker = db.prepare(`
      INSERT INTO workers (id, name, phone, role, password) VALUES (?, ?, ?, ?, ?)
    `);

    insertWorker.run('admin_001', '系统管理员', '13800138000', 'admin', hashedAdminPwd);
    insertWorker.run('worker_001', '张师傅', '13800138001', 'worker', hashedWorkerPwd);
    insertWorker.run('worker_002', '李师傅', '13800138002', 'worker', hashedWorkerPwd);
    insertWorker.run('worker_003', '王师傅', '13800138003', 'worker', hashedWorkerPwd);

    const insertFacility = db.prepare(`
      INSERT INTO facilities (id, name, type, location) VALUES (?, ?, ?, ?)
    `);

    insertFacility.run('fac_001', '1号楼电梯', 'elevator', '1号楼单元门');
    insertFacility.run('fac_002', '2号楼电梯', 'elevator', '2号楼单元门');
    insertFacility.run('fac_003', '3号楼电梯', 'elevator', '3号楼单元门');
    insertFacility.run('fac_004', '北门路灯A01', 'streetlight', '小区北门主干道');
    insertFacility.run('fac_005', '北门路灯A02', 'streetlight', '小区北门主干道');
    insertFacility.run('fac_006', '中心路灯B01', 'streetlight', '小区中心广场');
    insertFacility.run('fac_007', '健身器材-单杠', 'fitness', '中心花园健身区');
    insertFacility.run('fac_008', '健身器材-跑步机', 'fitness', '中心花园健身区');
    insertFacility.run('fac_009', '健身器材-秋千', 'fitness', '中心花园健身区');
    insertFacility.run('fac_010', '东门门禁', 'access', '小区东门');
    insertFacility.run('fac_011', '西门门禁', 'access', '小区西门');
    insertFacility.run('fac_012', '北门门禁', 'access', '小区北门');
  }

  const orderCount = db.prepare('SELECT COUNT(*) as count FROM repair_orders').get() as { count: number };
  if (orderCount.count === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO repair_orders (
        id, facility_id, facility_name, fault_type, description,
        status, reporter_name, reporter_phone,
        assignee_id, assignee_name, created_at, assigned_at, completed_at,
        photo_before, photo_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 28 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 52 * 60 * 60 * 1000);

    insertOrder.run(
      'order_001', 'fac_001', '1号楼电梯', '电梯灯不亮', '轿厢内照明灯不亮，黑暗',
      'pending', '张业主', '13900139001',
      null, null, dayAgo.toISOString(), null, null,
      '', null
    );

    insertOrder.run(
      'order_002', 'fac_004', '北门路灯A01', '灯不亮', '晚上不亮，黑漆漆的',
      'assigned', '李保安', '13900139002',
      'worker_001', '张师傅', hourAgo.toISOString(), hourAgo.toISOString(), null,
      '', null
    );

    insertOrder.run(
      'order_003', 'fac_007', '健身器材-单杠', '螺丝松动', '单杠连接处螺丝松动，摇晃',
      'completed', '王业主', '13900139003',
      'worker_002', '李师傅', yesterday.toISOString(), yesterday.toISOString(), hourAgo.toISOString(),
      '', ''
    );

    insertOrder.run(
      'order_004', 'fac_010', '东门门禁', '门禁失灵', '刷卡没反应，门打不开',
      'repairing', '赵保安', '13900139004',
      'worker_003', '王师傅', twoDaysAgo.toISOString(), twoDaysAgo.toISOString(), null,
      '', null
    );

    insertOrder.run(
      'order_005', 'fac_002', '2号楼电梯', '门开关故障', '电梯门开关不顺畅，有时夹人',
      'pending', '刘业主', '13900139005',
      null, null, twoDaysAgo.toISOString(), null, null,
      '', null
    );

    insertOrder.run(
      'order_006', 'fac_006', '中心路灯B01', '灯罩破损', '灯罩被石子打碎了',
      'assigned', '陈保安', '13900139006',
      'worker_001', '张师傅', yesterday.toISOString(), yesterday.toISOString(), null,
      '', null
    );

    insertOrder.run(
      'order_007', 'fac_001', '1号楼电梯', '按钮失灵', '3楼按钮按了没反应',
      'completed', '孙业主', '13900139007',
      'worker_002', '李师傅', twoDaysAgo.toISOString(), twoDaysAgo.toISOString(), yesterday.toISOString(),
      '', ''
    );
  }
}
