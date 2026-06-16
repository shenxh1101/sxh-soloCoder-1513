export type FacilityType = 'elevator' | 'streetlight' | 'fitness' | 'access' | 'other';

export type OrderStatus = 'pending' | 'assigned' | 'repairing' | 'completed';

export type WorkerRole = 'admin' | 'worker';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: string;
  qrCode: string;
  createdAt: string;
  repairCount?: number;
}

export interface RepairOrder {
  id: string;
  facilityId: string;
  facilityName: string;
  faultType: string;
  description: string;
  photoBefore: string;
  photoAfter?: string;
  status: OrderStatus;
  reporterName?: string;
  reporterPhone?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  assignedAt?: string;
  completedAt?: string;
  isOverdue?: boolean;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  role: WorkerRole;
  avatar?: string;
  createdAt: string;
}

export interface WorkerWithPassword extends Worker {
  password: string;
}

export interface Statistics {
  facilityRanking: { facilityId: string; facilityName: string; count: number }[];
  workerEfficiency: { workerId: string; workerName: string; avgRepairHours: number; completedCount: number }[];
  statusDistribution: { status: string; count: number; label: string }[];
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
}

export interface CreateFacilityRequest {
  name: string;
  type: FacilityType;
  location: string;
}

export interface CreateRepairOrderRequest {
  facilityId: string;
  faultType: string;
  description: string;
  photoBefore: string;
  reporterName?: string;
  reporterPhone?: string;
}

export interface AssignOrderRequest {
  assigneeId: string;
  assigneeName: string;
}

export interface CompleteOrderRequest {
  photoAfter: string;
}

export interface CreateWorkerRequest {
  name: string;
  phone: string;
  role: WorkerRole;
  password: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  worker?: Worker;
  message?: string;
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  elevator: '电梯',
  streetlight: '路灯',
  fitness: '健身器材',
  access: '门禁系统',
  other: '其他',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  assigned: '已派单',
  repairing: '维修中',
  completed: '已修好',
};

export const FAULT_TYPES: Record<FacilityType, string[]> = {
  elevator: ['电梯不运行', '电梯灯不亮', '门开关故障', '按钮失灵', '异响', '其他'],
  streetlight: ['灯不亮', '灯罩破损', '灯杆倾斜', '线路故障', '其他'],
  fitness: ['器材损坏', '螺丝松动', '锈蚀', '其他'],
  access: ['门禁失灵', '读卡器故障', '门锁损坏', '其他'],
  other: ['其他故障'],
};
