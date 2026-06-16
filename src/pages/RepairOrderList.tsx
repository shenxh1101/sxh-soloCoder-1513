import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { RepairOrderCard } from '../components/RepairOrderCard';
import { STATUS_LABELS } from '../../shared/types';
import type { OrderStatus } from '../../shared/types';

export default function RepairOrderList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { repairOrders, facilities, workers, setRepairOrders, setFacilities, setWorkers, currentUser } = useAppStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orders, facs, wrks] = await Promise.all([
        api.repairOrders.getAll(),
        api.facilities.getAll(),
        api.workers.getAll('worker'),
      ]);
      setRepairOrders(orders);
      setFacilities(facs);
      setWorkers(wrks);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = repairOrders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (facilityFilter !== 'all' && order.facilityId !== facilityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.facilityName.toLowerCase().includes(query) ||
        order.faultType.toLowerCase().includes(query) ||
        order.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const overdueCount = repairOrders.filter(
    (o) => o.isOverdue && o.status !== 'completed'
  ).length;

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报修单列表</h1>
          <p className="text-gray-500 mt-1">共 {filteredOrders.length} 条报修单</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>{overdueCount} 单超时</span>
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索设施名称、故障类型..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">全部设施</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">暂无符合条件的报修单</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredOrders.map((order, index) => (
            <div
              key={order.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <RepairOrderCard order={order} workers={workers} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
