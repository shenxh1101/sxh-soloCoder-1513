import { Router, Request, Response } from 'express';
import { db } from '../db';
import { RepairOrder, CreateRepairOrderRequest, AssignOrderRequest, CompleteOrderRequest, STATUS_LABELS, TimelineEvent } from '../../shared/types';

const router = Router();

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const generateTimeline = (row: any): TimelineEvent[] => {
  const timeline: TimelineEvent[] = [];
  
  timeline.push({
    status: 'pending',
    label: '提交报修',
    time: row.created_at,
    description: `${row.reporter_name || '匿名用户'} 提交了报修单`,
    icon: 'clipboard-list',
  });
  
  if (row.assigned_at) {
    timeline.push({
      status: 'assigned',
      label: '派单',
      time: row.assigned_at,
      description: `派单给 ${row.assignee_name}`,
      icon: 'user-check',
    });
  }
  
  if (row.started_at) {
    timeline.push({
      status: 'repairing',
      label: '开始维修',
      time: row.started_at,
      description: `${row.assignee_name} 开始现场维修`,
      icon: 'wrench',
    });
  }
  
  if (row.completed_at) {
    timeline.push({
      status: 'completed',
      label: '维修完成',
      time: row.completed_at,
      description: `维修完成，已上传修好的照片`,
      icon: 'check-circle',
    });
  }
  
  return timeline;
};

const calculateExpectedCompletion = (row: any): string | undefined => {
  if (row.status === 'completed' || !row.created_at) return undefined;
  
  const createdAt = new Date(row.created_at);
  const expectedTime = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000);
  return expectedTime.toISOString();
};

const mapToOrder = (row: any): RepairOrder => {
  const createdAt = new Date(row.created_at).getTime();
  const now = Date.now();
  const isOverdue = row.status !== 'completed' && (now - createdAt) > TWENTY_FOUR_HOURS;
  
  return {
    id: row.id,
    facilityId: row.facility_id,
    facilityName: row.facility_name,
    facilityType: row.facility_type || undefined,
    facilityLocation: row.facility_location || undefined,
    faultType: row.fault_type,
    description: row.description,
    photoBefore: row.photo_before,
    photoAfter: row.photo_after || undefined,
    status: row.status,
    reporterName: row.reporter_name || undefined,
    reporterPhone: row.reporter_phone || undefined,
    assigneeId: row.assignee_id || undefined,
    assigneeName: row.assignee_name || undefined,
    createdAt: row.created_at,
    assignedAt: row.assigned_at || undefined,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    isOverdue,
    expectedCompletion: calculateExpectedCompletion(row),
    timeline: generateTimeline(row),
  };
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, facilityId, assigneeId, search } = req.query;
    
    let sql = `
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      sql += ' AND ro.status = ?';
      params.push(status);
    }
    
    if (facilityId) {
      sql += ' AND ro.facility_id = ?';
      params.push(facilityId);
    }
    
    if (assigneeId) {
      sql += ' AND ro.assignee_id = ?';
      params.push(assigneeId);
    }
    
    if (search) {
      sql += ' AND (ro.facility_name LIKE ? OR ro.fault_type LIKE ? OR ro.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY ro.created_at DESC';
    
    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(mapToOrder));
  } catch (error) {
    res.status(500).json({ error: '获取报修单列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '获取报修单详情失败' });
  }
});

router.get('/phone/:phone', (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    
    if (!phone) {
      return res.status(400).json({ error: '请提供手机号' });
    }
    
    const rows = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.reporter_phone = ?
      ORDER BY ro.created_at DESC
      LIMIT 10
    `).all(phone);
    
    res.json(rows.map(mapToOrder));
  } catch (error) {
    res.status(500).json({ error: '查询报修单失败' });
  }
});

router.post('/', (req: Request<{}, {}, CreateRepairOrderRequest>, res: Response) => {
  try {
    const { facilityId, faultType, description, photoBefore, reporterName, reporterPhone } = req.body;
    
    if (!facilityId || !faultType) {
      return res.status(400).json({ error: '请填写必要信息' });
    }
    
    const facility = db.prepare('SELECT name FROM facilities WHERE id = ?').get(facilityId) as { name: string } | undefined;
    if (!facility) {
      return res.status(404).json({ error: '设施不存在' });
    }
    
    const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    db.prepare(`
      INSERT INTO repair_orders (
        id, facility_id, facility_name, fault_type, description,
        photo_before, reporter_name, reporter_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, facilityId, facility.name, faultType, description, photoBefore, reporterName, reporterPhone);
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.status(201).json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '提交报修失败' });
  }
});

router.put('/:id/assign', (req: Request<{ id: string }, {}, AssignOrderRequest>, res: Response) => {
  try {
    const { assigneeId, assigneeName } = req.body;
    const { id } = req.params;
    
    if (!assigneeId || !assigneeName) {
      return res.status(400).json({ error: '请选择维修师傅' });
    }
    
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(assigneeId);
    if (!worker) {
      return res.status(404).json({ error: '维修师傅不存在' });
    }
    
    const result = db.prepare(`
      UPDATE repair_orders 
      SET status = 'assigned', 
          assignee_id = ?, 
          assignee_name = ?,
          assigned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(assigneeId, assigneeName, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '派单失败' });
  }
});

router.put('/:id/start', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = db.prepare(`
      UPDATE repair_orders 
      SET status = 'repairing',
          started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' });
  }
});

router.put('/:id/complete', (req: Request<{ id: string }, {}, CompleteOrderRequest>, res: Response) => {
  try {
    const { photoAfter } = req.body;
    const { id } = req.params;
    
    if (!photoAfter) {
      return res.status(400).json({ error: '请上传维修完成照片' });
    }
    
    const result = db.prepare(`
      UPDATE repair_orders 
      SET status = 'completed', 
          photo_after = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(photoAfter, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '完成报修失败' });
  }
});

router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    
    if (!Object.keys(STATUS_LABELS).includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }
    
    const result = db.prepare(`
      UPDATE repair_orders 
      SET status = ?
      WHERE id = ?
    `).run(status, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '更新状态失败' });
  }
});

export default router;
