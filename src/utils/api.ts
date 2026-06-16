import type {
  Facility,
  RepairOrder,
  Worker,
  WorkerWorkload,
  Statistics,
  StatisticsQuery,
  CreateFacilityRequest,
  CreateRepairOrderRequest,
  AssignOrderRequest,
  CompleteOrderRequest,
  CreateWorkerRequest,
  LoginRequest,
  LoginResponse,
  HotspotData,
  HotspotTimeRange,
} from '../../shared/types';

export interface BoardData {
  pending: RepairOrder[];
  assigned: RepairOrder[];
  repairing: RepairOrder[];
  nearOverdue: RepairOrder[];
  overdue: RepairOrder[];
  totalCount: number;
}

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  facilities: {
    getAll: () => request<Facility[]>('/facilities'),
    getById: (id: string) => request<Facility>(`/facilities/${id}`),
    create: (data: CreateFacilityRequest) =>
      request<Facility>('/facilities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: CreateFacilityRequest) =>
      request<Facility>(`/facilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/facilities/${id}`, {
        method: 'DELETE',
      }),
  },

  repairOrders: {
    getAll: (params?: {
      status?: string;
      facilityId?: string;
      assigneeId?: string;
      search?: string;
      location?: string;
    }) => {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : '';
      return request<RepairOrder[]>(`/repair-orders${query}`);
    },
    getBoard: (params?: { location?: string; assigneeId?: string }) => {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : '';
      return request<BoardData>(`/repair-orders/board${query}`);
    },
    getById: (id: string) => request<RepairOrder>(`/repair-orders/${id}`),
    create: (data: CreateRepairOrderRequest) =>
      request<RepairOrder>('/repair-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assign: (id: string, data: AssignOrderRequest & { operatorName?: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/assign`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    start: (id: string, data?: { operatorName?: string; note?: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/start`, {
        method: 'PUT',
        body: JSON.stringify(data || {}),
      }),
    addNote: (id: string, data: { operatorName: string; operatorRole?: string; note: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/note`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addPhoto: (id: string, data: { operatorName: string; photo: string; description?: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/photo`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    markUrgent: (id: string, data?: { operatorName?: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/urgent`, {
        method: 'PUT',
        body: JSON.stringify(data || {}),
      }),
    complete: (id: string, data: CompleteOrderRequest & { operatorName?: string; note?: string }) =>
      request<RepairOrder>(`/repair-orders/${id}/complete`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      request<RepairOrder>(`/repair-orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    getByPhone: (phone: string) =>
      request<RepairOrder[]>(`/repair-orders/phone/${phone}`),
  },

  workers: {
    getAll: (role?: string) => {
      const query = role ? `?role=${role}` : '';
      return request<Worker[]>(`/workers${query}`);
    },
    getWorkload: () =>
      request<WorkerWorkload[]>('/workers/workload'),
    create: (data: CreateWorkerRequest) =>
      request<Worker>('/workers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: LoginRequest) =>
      request<LoginResponse>('/workers/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  statistics: {
    get: (params?: StatisticsQuery) => {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : '';
      return request<Statistics>(`/statistics${query}`);
    },
    getHotspot: (timeRange?: HotspotTimeRange) => {
      const query = timeRange ? `?timeRange=${timeRange}` : '';
      return request<HotspotData>(`/statistics/hotspot${query}`);
    },
  },

  uploadPhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '上传失败' }));
      throw new Error(error.error || '上传失败');
    }

    const data = await response.json();
    return data.url;
  },
};
