import { Router, Request, Response } from 'express';
import { db } from '../db';
import bcrypt from 'bcryptjs';
import { Worker, CreateWorkerRequest, LoginRequest, LoginResponse, WorkerWorkload } from '../../shared/types';

const router = Router();

const mapToWorker = (row: any): Worker => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  role: row.role,
  avatar: row.avatar || undefined,
  createdAt: row.created_at,
});

router.get('/workload', (req: Request, res: Response) => {
  try {
    const workers = db.prepare(`
      SELECT id, name FROM workers WHERE role = 'worker'
    `).all() as { id: string; name: string }[];
    
    const workloads: WorkerWorkload[] = workers.map(worker => {
      // 待处理工单数量（已派单但未开始）
      const pendingResult = db.prepare(`
        SELECT COUNT(*) as count FROM repair_orders 
        WHERE assignee_id = ? AND status = 'assigned'
      `).get(worker.id) as { count: number };
      
      // 进行中工单数量
      const inProgressResult = db.prepare(`
        SELECT COUNT(*) as count FROM repair_orders 
        WHERE assignee_id = ? AND status = 'repairing'
      `).get(worker.id) as { count: number };
      
      // 最近7天完成的工单
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const last7DaysResult = db.prepare(`
        SELECT COUNT(*) as count FROM repair_orders 
        WHERE assignee_id = ? AND status = 'completed' AND completed_at >= ?
      `).get(worker.id, sevenDaysAgo) as { count: number };
      
      // 平均维修时间（最近30天已完成的工单）
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const avgResult = db.prepare(`
        SELECT 
          AVG(
            (julianday(completed_at) - julianday(assigned_at)) * 24
          ) as avg_hours
        FROM repair_orders 
        WHERE assignee_id = ? 
          AND status = 'completed' 
          AND completed_at >= ?
          AND assigned_at IS NOT NULL
          AND completed_at IS NOT NULL
      `).get(worker.id, thirtyDaysAgo) as { avg_hours: number | null };
      
      return {
        id: worker.id,
        name: worker.name,
        pendingCount: pendingResult.count,
        inProgressCount: inProgressResult.count,
        totalUncompleted: pendingResult.count + inProgressResult.count,
        avgRepairHours: avgResult.avg_hours ? Math.round(avgResult.avg_hours * 10) / 10 : 0,
        last7DaysCompleted: last7DaysResult.count,
      };
    });
    
    // 按未完成工单数量排序，负载低的排前面
    workloads.sort((a, b) => a.totalUncompleted - b.totalUncompleted);
    
    res.json(workloads);
  } catch (error) {
    res.status(500).json({ error: '获取师傅负载信息失败' });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    
    let sql = 'SELECT id, name, phone, role, avatar, created_at FROM workers WHERE 1=1';
    const params: any[] = [];
    
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(mapToWorker));
  } catch (error) {
    res.status(500).json({ error: '获取工作人员列表失败' });
  }
});

router.post('/', (req: Request<{}, {}, CreateWorkerRequest>, res: Response) => {
  try {
    const { name, phone, role, password } = req.body;
    
    if (!name || !phone || !role || !password) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const existing = db.prepare('SELECT * FROM workers WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    
    const id = `${role === 'admin' ? 'admin' : 'worker'}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.prepare(`
      INSERT INTO workers (id, name, phone, role, password)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, phone, role, hashedPassword);
    
    const row = db.prepare('SELECT id, name, phone, role, avatar, created_at FROM workers WHERE id = ?').get(id);
    res.status(201).json(mapToWorker(row));
  } catch (error) {
    res.status(500).json({ error: '创建工作人员失败' });
  }
});

router.post('/login', (req: Request<{}, {}, LoginRequest>, res: Response<LoginResponse>) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.json({ success: false, message: '请输入手机号和密码' });
    }
    
    const row = db.prepare('SELECT * FROM workers WHERE phone = ?').get(phone) as { id: string; name: string; phone: string; role: string; password: string; avatar?: string; created_at: string } | undefined;
    if (!row) {
      return res.json({ success: false, message: '手机号或密码错误' });
    }
    
    const isValid = bcrypt.compareSync(password, row.password);
    if (!isValid) {
      return res.json({ success: false, message: '手机号或密码错误' });
    }
    
    res.json({
      success: true,
      worker: mapToWorker(row),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

export default router;
