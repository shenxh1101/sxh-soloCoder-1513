import { Router, Request, Response } from 'express';
import { db } from '../db';
import { RepairOrder, CreateRepairOrderRequest, AssignOrderRequest, CompleteOrderRequest, STATUS_LABELS, TimelineEvent, OrderOperation, OperationType, ProcessPhoto } from '../../shared/types';

const router = Router();

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const EIGHTEEN_HOURS = 18 * 60 * 60 * 1000;

const addOperation = (orderId: string, type: OperationType, operatorName: string, operatorRole?: string, note?: string, photo?: string) => {
  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  db.prepare(`
    INSERT INTO order_operations (id, order_id, type, operator_name, operator_role, note, photo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, orderId, type, operatorName, operatorRole || null, note || null, photo || null);
};

const getOperations = (orderId: string): OrderOperation[] => {
  const rows = db.prepare(`
    SELECT * FROM order_operations WHERE order_id = ? ORDER BY created_at ASC
  `).all(orderId) as any[];
  return rows.map(row => ({
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    operatorName: row.operator_name,
    operatorRole: row.operator_role || undefined,
    note: row.note || undefined,
    photo: row.photo || undefined,
    createdAt: row.created_at,
  }));
};

const getProcessPhotos = (orderId: string): ProcessPhoto[] => {
  const rows = db.prepare(`
    SELECT id, photo_url, description, created_at FROM order_process_photos WHERE order_id = ? ORDER BY created_at ASC
  `).all(orderId) as any[];
  return rows.map(r => ({
    id: r.id,
    photo: r.photo_url,
    note: r.description || undefined,
    createdAt: r.created_at,
  }));
};

const addProcessPhoto = (orderId: string, photoUrl: string, description?: string) => {
  const id = `pp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  db.prepare(`
    INSERT INTO order_process_photos (id, order_id, photo_url, description)
    VALUES (?, ?, ?, ?)
  `).run(id, orderId, photoUrl, description || null);
};

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
  const elapsed = now - createdAt;
  const isOverdue = row.status !== 'completed' && elapsed > TWENTY_FOUR_HOURS;
  const isNearOverdue = row.status !== 'completed' && !isOverdue && elapsed > EIGHTEEN_HOURS;
  
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
    isNearOverdue,
    expectedCompletion: calculateExpectedCompletion(row),
    timeline: generateTimeline(row),
    operations: getOperations(row.id),
    processPhotos: getProcessPhotos(row.id),
  };
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, facilityId, assigneeId, search, location } = req.query;
    
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
    
    if (location) {
      sql += ' AND f.location LIKE ?';
      params.push(`%${location}%`);
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

router.get('/board', (req: Request, res: Response) => {
  try {
    const { location, assigneeId } = req.query;
    
    let baseSql = `
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.status != 'completed'
    `;
    const params: any[] = [];
    
    if (location) {
      baseSql += ' AND f.location LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (assigneeId) {
      baseSql += ' AND ro.assignee_id = ?';
      params.push(assigneeId);
    }
    
    const rows = db.prepare(baseSql).all(...params);
    const allOrders = rows.map(mapToOrder);
    
    const pending = allOrders.filter(o => o.status === 'pending');
    const assigned = allOrders.filter(o => o.status === 'assigned');
    const repairing = allOrders.filter(o => o.status === 'repairing');
    const nearOverdue = allOrders.filter(o => o.isNearOverdue && !o.isOverdue);
    const overdue = allOrders.filter(o => o.isOverdue);
    
    res.json({
      pending,
      assigned,
      repairing,
      nearOverdue,
      overdue,
      totalCount: allOrders.length,
    });
  } catch (error) {
    res.status(500).json({ error: '获取值班看板数据失败' });
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
    
    if (!phone || phone.trim().length < 11) {
      return res.status(400).json({ error: '请输入正确的手机号' });
    }
    
    const cleanPhone = phone.trim();
    
    const rows = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.reporter_phone = ?
      ORDER BY ro.created_at DESC
      LIMIT 20
    `).all(cleanPhone);
    
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
    
    addOperation(id, 'submit', reporterName || '匿名用户', 'reporter', `提交报修：${faultType}`);
    
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

router.put('/:id/assign', (req: Request<{ id: string }, {}, AssignOrderRequest & { operatorName?: string }>, res: Response) => {
  try {
    const { assigneeId, assigneeName, operatorName } = req.body;
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
    
    addOperation(id, 'assign', operatorName || '调度员', 'admin', `派单给 ${assigneeName}`);
    
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

router.put('/:id/start', (req: Request<{ id: string }, {}, { operatorName?: string; note?: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorName, note } = req.body;
    
    const result = db.prepare(`
      UPDATE repair_orders 
      SET status = 'repairing',
          started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    const order = db.prepare('SELECT assignee_name FROM repair_orders WHERE id = ?').get(id) as { assignee_name: string };
    addOperation(id, 'start', operatorName || order.assignee_name || '维修师傅', 'worker', note || '开始现场维修');
    
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

router.post('/:id/note', (req: Request<{ id: string }, {}, { operatorName: string; operatorRole?: string; note: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorName, operatorRole, note } = req.body;
    
    if (!note || !note.trim()) {
      return res.status(400).json({ error: '请填写备注内容' });
    }
    
    const exists = db.prepare('SELECT id FROM repair_orders WHERE id = ?').get(id);
    if (!exists) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    addOperation(id, 'note', operatorName, operatorRole, note.trim());
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '添加备注失败' });
  }
});

router.post('/:id/photo', (req: Request<{ id: string }, {}, { operatorName: string; photo: string; description?: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorName, photo, description } = req.body;
    
    if (!photo) {
      return res.status(400).json({ error: '请上传照片' });
    }
    
    const exists = db.prepare('SELECT id FROM repair_orders WHERE id = ?').get(id);
    if (!exists) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    addProcessPhoto(id, photo, description);
    addOperation(id, 'photo', operatorName, 'worker', description || '上传维修过程照片', photo);
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '上传照片失败' });
  }
});

router.put('/:id/urgent', (req: Request<{ id: string }, {}, { operatorName?: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorName } = req.body;
    
    const exists = db.prepare('SELECT id FROM repair_orders WHERE id = ?').get(id);
    if (!exists) {
      return res.status(404).json({ error: '报修单不存在' });
    }
    
    addOperation(id, 'urgent', operatorName || '调度员', 'admin', '标记为紧急，催促处理');
    
    const row = db.prepare(`
      SELECT ro.*, f.type as facility_type, f.location as facility_location
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      WHERE ro.id = ?
    `).get(id);
    res.json(mapToOrder(row));
  } catch (error) {
    res.status(500).json({ error: '催办失败' });
  }
});

router.put('/:id/complete', (req: Request<{ id: string }, {}, CompleteOrderRequest & { operatorName?: string; note?: string }>, res: Response) => {
  try {
    const { photoAfter, operatorName, note } = req.body;
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
    
    const order = db.prepare('SELECT assignee_name FROM repair_orders WHERE id = ?').get(id) as { assignee_name: string };
    addOperation(id, 'complete', operatorName || order.assignee_name || '维修师傅', 'worker', note || '维修完成', photoAfter);
    
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
