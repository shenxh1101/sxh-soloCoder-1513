import { Router, Request, Response } from 'express';
import { db } from '../db';
import { Statistics, STATUS_LABELS } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const facilityRanking = db.prepare(`
      SELECT f.id as facilityId, f.name as facilityName, COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      GROUP BY f.id, f.name
      ORDER BY count DESC
      LIMIT 10
    `).all() as { facilityId: string; facilityName: string; count: number }[];

    const workerEfficiency = db.prepare(`
      SELECT 
        w.id as workerId, 
        w.name as workerName, 
        COUNT(ro.id) as completedCount,
        AVG(
          CASE 
            WHEN ro.completed_at IS NOT NULL AND ro.assigned_at IS NOT NULL 
            THEN (julianday(ro.completed_at) - julianday(ro.assigned_at)) * 24
            ELSE NULL 
          END
        ) as avgRepairHours
      FROM workers w
      LEFT JOIN repair_orders ro ON w.id = ro.assignee_id AND ro.status = 'completed'
      WHERE w.role = 'worker'
      GROUP BY w.id, w.name
      HAVING completedCount > 0
      ORDER BY avgRepairHours ASC
      LIMIT 10
    `).all() as { workerId: string; workerName: string; avgRepairHours: number; completedCount: number }[];

    const statusRows = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM repair_orders
      GROUP BY status
    `).all() as { status: string; count: number }[];

    const statusDistribution = Object.entries(STATUS_LABELS).map(([status, label]) => {
      const row = statusRows.find(r => r.status === status);
      return {
        status,
        label,
        count: row?.count || 0,
      };
    });

    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM repair_orders').get() as { count: number };
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM repair_orders WHERE status IN ('pending', 'assigned', 'repairing')").get() as { count: number };
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM repair_orders 
      WHERE status = 'completed' AND DATE(completed_at) = ?
    `).get(today) as { count: number };

    const statistics: Statistics = {
      facilityRanking,
      workerEfficiency: workerEfficiency.map(w => ({
        ...w,
        avgRepairHours: Number(w.avgRepairHours?.toFixed(1)) || 0,
      })),
      statusDistribution,
      totalOrders: totalOrders.count,
      pendingOrders: pendingOrders.count,
      completedToday: completedToday.count,
    };

    res.json(statistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

export default router;
