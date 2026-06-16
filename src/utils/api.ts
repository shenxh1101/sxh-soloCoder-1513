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
} from '../../shared/types';

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
    }) => {
      const query = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : '';
      return request<RepairOrder[]>(`/repair-orders${query}`);
    },
    getById: (id: string) => request<RepairOrder>(`/repair-orders/${id}`),
    create: (data: CreateRepairOrderRequest) =>
      request<RepairOrder>('/repair-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assign: (id: string, data: AssignOrderRequest) =>
      request<RepairOrder>(`/repair-orders/${id}/assign`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    start: (id: string) =>
      request<RepairOrder>(`/repair-orders/${id}/start`, {
        method: 'PUT',
      }),
    complete: (id: string, data: CompleteOrderRequest) =>
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
