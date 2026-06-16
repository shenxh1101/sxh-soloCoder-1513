import { Router, Request, Response } from 'express';
import { db } from '../db';
import { Facility, CreateFacilityRequest } from '../../shared/types';

const router = Router();

const mapToFacility = (row: any): Facility => ({
  id: row.id,
  name: row.name,
  type: row.type,
  location: row.location,
  qrCode: row.qr_code,
  createdAt: row.created_at,
  repairCount: row.repair_count,
});

router.get('/', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, 
             (SELECT COUNT(*) FROM repair_orders ro WHERE ro.facility_id = f.id) as repair_count
      FROM facilities f
      ORDER BY f.created_at DESC
    `).all();
    
    res.json(rows.map(mapToFacility));
  } catch (error) {
    res.status(500).json({ error: '获取设施列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare(`
      SELECT f.*, 
             (SELECT COUNT(*) FROM repair_orders ro WHERE ro.facility_id = f.id) as repair_count
      FROM facilities f
      WHERE f.id = ?
    `).get(req.params.id);
    
    if (!row) {
      return res.status(404).json({ error: '设施不存在' });
    }
    
    res.json(mapToFacility(row));
  } catch (error) {
    res.status(500).json({ error: '获取设施信息失败' });
  }
});

router.post('/', (req: Request<{}, {}, CreateFacilityRequest>, res: Response) => {
  try {
    const { name, type, location } = req.body;
    
    if (!name || !type || !location) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const id = `fac_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    db.prepare(`
      INSERT INTO facilities (id, name, type, location)
      VALUES (?, ?, ?, ?)
    `).run(id, name, type, location);
    
    const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
    res.status(201).json(mapToFacility(row));
  } catch (error) {
    res.status(500).json({ error: '创建设施失败' });
  }
});

router.put('/:id', (req: Request<{ id: string }, {}, CreateFacilityRequest>, res: Response) => {
  try {
    const { name, type, location } = req.body;
    const { id } = req.params;
    
    if (!name || !type || !location) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    
    const result = db.prepare(`
      UPDATE facilities 
      SET name = ?, type = ?, location = ?
      WHERE id = ?
    `).run(name, type, location, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '设施不存在' });
    }
    
    const row = db.prepare('SELECT * FROM facilities WHERE id = ?').get(id);
    res.json(mapToFacility(row));
  } catch (error) {
    res.status(500).json({ error: '更新设施失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const orderCount = db.prepare(
      'SELECT COUNT(*) as count FROM repair_orders WHERE facility_id = ?'
    ).get(id) as { count: number };
    
    if (orderCount.count > 0) {
      return res.status(400).json({ error: '该设施存在报修记录，无法删除' });
    }
    
    const result = db.prepare('DELETE FROM facilities WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '设施不存在' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除设施失败' });
  }
});

export default router;
