import { Router, Request, Response } from 'express';
import { db } from '../db';
import { Statistics, STATUS_LABELS, FACILITY_TYPE_LABELS, StatisticsQuery, FacilityType, HotspotData, HotspotTimeRange } from '../../shared/types';

const router = Router();

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const buildTimeRangeCondition = (timeRange?: string): { condition: string; params: any[] } => {
  if (!timeRange || timeRange === 'all') {
    return { condition: '', params: [] };
  }
  
  const now = Date.now();
  let startTime: number;
  
  switch (timeRange) {
    case '7d':
      startTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      startTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'month': {
      const d = new Date();
      startTime = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      break;
    }
    default:
      return { condition: '', params: [] };
  }
  
  return {
    condition: ' AND ro.created_at >= ?',
    params: [new Date(startTime).toISOString()],
  };
};

router.get('/', (req: Request<{}, {}, {}, StatisticsQuery>, res: Response) => {
  try {
    const { facilityType, month, location, timeRange } = req.query;
    
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (facilityType) {
      whereConditions.push('f.type = ?');
      params.push(facilityType);
    }
    
    if (month) {
      whereConditions.push("strftime('%Y-%m', ro.created_at) = ?");
      params.push(month);
    }
    
    if (location) {
      whereConditions.push('f.location LIKE ?');
      params.push(`%${location}%`);
    }
    
    const timeRangeResult = buildTimeRangeCondition(timeRange);
    if (timeRangeResult.condition) {
      whereConditions.push('1=1' + timeRangeResult.condition);
      params.push(...timeRangeResult.params);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const facilityRanking = db.prepare(`
      SELECT 
        f.id as facilityId, 
        f.name as facilityName, 
        f.type as facilityType,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      GROUP BY f.id, f.name, f.type
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 10
    `).all(...params) as { facilityId: string; facilityName: string; facilityType: FacilityType; count: number }[];

    const facilityTypeRanking = db.prepare(`
      SELECT 
        f.type as facilityType,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      GROUP BY f.type
      HAVING count > 0
      ORDER BY count DESC
    `).all(...params) as { facilityType: FacilityType; count: number }[];

    const locationRanking = db.prepare(`
      SELECT 
        f.location as location,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      WHERE f.location IS NOT NULL AND f.location != ''
      GROUP BY f.location
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 10
    `).all(...params) as { location: string; count: number }[];

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
      SELECT ro.status, COUNT(*) as count
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause}
      GROUP BY ro.status
    `).all(...params) as { status: string; count: number }[];

    const statusDistribution = Object.entries(STATUS_LABELS).map(([status, label]) => {
      const row = statusRows.find(r => r.status === status);
      return {
        status,
        label,
        count: row?.count || 0,
      };
    });

    const monthlyTrend = db.prepare(`
      SELECT 
        strftime('%Y-%m', ro.created_at) as month,
        COUNT(ro.id) as count
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause}
      GROUP BY strftime('%Y-%m', ro.created_at)
      ORDER BY month DESC
      LIMIT 6
    `).all(...params) as { month: string; count: number }[];
    
    monthlyTrend.reverse();

    const totalOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause}
    `).get(...params) as { count: number };
    
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause ? whereClause + ' AND ' : 'WHERE '} ro.status IN ('pending', 'assigned', 'repairing')
    `).get(...params) as { count: number };

    const allNonCompleted = db.prepare(`
      SELECT ro.created_at
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause ? whereClause + ' AND ' : 'WHERE '} ro.status != 'completed'
    `).all(...params) as { created_at: string }[];
    
    const now = Date.now();
    let overdueOrders = 0;
    let nearOverdueOrders = 0;
    for (const row of allNonCompleted) {
      const elapsed = now - new Date(row.created_at).getTime();
      if (elapsed > TWENTY_FOUR_HOURS) {
        overdueOrders++;
      } else if (elapsed > 18 * 60 * 60 * 1000) {
        nearOverdueOrders++;
      }
    }
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM repair_orders ro
      LEFT JOIN facilities f ON ro.facility_id = f.id
      ${whereClause ? whereClause + ' AND ' : 'WHERE '} ro.status = 'completed' AND DATE(ro.completed_at) = ?
    `).get(...params, today) as { count: number };

    const avgRepairTime = db.prepare(`
      SELECT 
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND assigned_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(assigned_at)) * 24
            ELSE NULL 
          END
        ) as avgRepairHours
      FROM repair_orders
      WHERE status = 'completed'
    `).get() as { avgRepairHours: number | null };

    const statistics: Statistics = {
      facilityRanking: facilityRanking.map(fr => ({
        ...fr,
        facilityType: fr.facilityType,
      })),
      facilityTypeRanking: facilityTypeRanking.map(ftr => ({
        facilityType: ftr.facilityType,
        facilityTypeLabel: FACILITY_TYPE_LABELS[ftr.facilityType] || '其他',
        count: ftr.count,
      })),
      locationRanking,
      workerEfficiency: workerEfficiency.map(w => ({
        ...w,
        avgRepairHours: Number(w.avgRepairHours?.toFixed(1)) || 0,
      })),
      statusDistribution,
      monthlyTrend,
      totalOrders: totalOrders.count,
      pendingOrders: pendingOrders.count,
      overdueOrders,
      nearOverdueOrders,
      completedToday: completedToday.count,
      avgRepairHours: Number(avgRepairTime.avgRepairHours?.toFixed(1)) || 0,
    };

    res.json(statistics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

router.get('/hotspot', (req: Request<{}, {}, {}, { timeRange?: HotspotTimeRange }>, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as HotspotTimeRange) || '7d';
    
    const timeRangeResult = buildTimeRangeCondition(timeRange);
    const params = timeRangeResult.params;
    const whereClause = timeRangeResult.condition ? 'WHERE 1=1' + timeRangeResult.condition : '';
    
    const topLocations = db.prepare(`
      SELECT 
        f.location as location,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      WHERE f.location IS NOT NULL AND f.location != ''
      GROUP BY f.location
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `).all(...params) as { location: string; count: number }[];
    
    const topFacilityTypes = db.prepare(`
      SELECT 
        f.type as facilityType,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      GROUP BY f.type
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `).all(...params) as { facilityType: FacilityType; count: number }[];
    
    const topFacilities = db.prepare(`
      SELECT 
        f.id as facilityId,
        f.name as facilityName,
        COUNT(ro.id) as count
      FROM facilities f
      LEFT JOIN repair_orders ro ON f.id = ro.facility_id
      ${whereClause}
      GROUP BY f.id, f.name
      HAVING count > 0
      ORDER BY count DESC
      LIMIT 5
    `).all(...params) as { facilityId: string; facilityName: string; count: number }[];
    
    const hotspot: HotspotData = {
      topLocations,
      topFacilityTypes: topFacilityTypes.map(t => ({
        facilityType: t.facilityType,
        facilityTypeLabel: FACILITY_TYPE_LABELS[t.facilityType] || '其他',
        count: t.count,
      })),
      topFacilities,
      timeRange,
    };
    
    res.json(hotspot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '获取热点数据失败' });
  }
});

export default router;
