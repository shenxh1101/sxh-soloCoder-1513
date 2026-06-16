import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  UserCheck,
  Wrench,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  RefreshCw,
  ExternalLink,
  BellRing,
  UserPlus,
} from 'lucide-react';
import { api, BoardData } from '../utils/api';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { RepairOrder, FACILITY_TYPE_LABELS } from '../../shared/types';
import { formatDateTime, getTimeUntilOverdue } from '../utils/format';
import { AssignOrderModal } from '../components/AssignOrderModal';

interface BoardColumn {
  key: 'pending' | 'assigned' | 'repairing' | 'nearOverdue' | 'overdue';
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const columns: BoardColumn[] = [
  {
    key: 'pending',
    label: '待派单',
    icon: ClipboardList,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    key: 'assigned',
    label: '已派单',
    icon: UserCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'repairing',
    label: '维修中',
    icon: Wrench,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    key: 'nearOverdue',
    label: '快超时',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    key: 'overdue',
    label: '已超时',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
];

function OrderCard({
  order,
  onAssign,
  onUrgent,
}: {
  order: RepairOrder;
  onAssign: (order: RepairOrder) => void;
  onUrgent: (order: RepairOrder) => void;
}) {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const overdueInfo = getTimeUntilOverdue(order.createdAt);

  const showAssign = (
    <div
      className={
        'bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer' +
        (order.isOverdue ? ' border-red-300 bg-red-50/50' : ' border-gray-200')
      }
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {order.facilityType && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {FACILITY_TYPE_LABELS[order.facilityType]}
            </span>
          )}
          <StatusBadge status={order.status} isOverdue={order.isOverdue} />
        </div>
        <span className="text-xs text-gray-400">
          {formatDateTime(order.createdAt)}
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-1 truncate">
        {order.facilityName}
      </h4>
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {order.faultType}
        {order.description ? ` - ${order.description}` : ''}
      </p>

      {order.facilityLocation && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{order.facilityLocation}</span>
        </div>
      )}

      {(order.reporterName || order.assigneeName) && (
        <div className="flex items-center justify-between text-xs">
          {order.reporterName && (
            <div className="flex items-center gap-1 text-gray-500">
              <User className="w-3 h-3" />
              <span>{order.reporterName}</span>
            </div>
          )}
          {order.assigneeName && (
            <div className="flex items-center gap-1 text-blue-600">
              <UserCheck className="w-3 h-3" />
              <span>{order.assigneeName}</span>
            </div>
          )}
        </div>
      )}

      {(order.isOverdue || order.isNearOverdue) && (
        <div
          className={
            'mt-3 pt-3 border-t flex items-center justify-between' +
            (order.isOverdue ? ' border-red-200' : ' border-amber-200')
          }
        >
          <span
            className={
              'text-xs font-medium flex items-center gap-1' +
              (order.isOverdue ? ' text-red-600' : ' text-amber-600')
            }
          >
            {order.isOverdue ? (
              <AlertTriangle className="w-3 h-3 animate-pulse" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {overdueInfo.remainingText}
          </span>
          {order.isOverdue && currentUser?.role === 'admin' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUrgent(order);
              }}
              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors flex items-center gap-1"
            >
              <BellRing className="w-3 h-3" />
              催办
            </button>
          )}
        </div>
      )}

      {order.status === 'pending' && currentUser?.role === 'admin' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign(order);
            }}
            className="w-full py-2 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 transition-colors flex items-center justify-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            立即派单
          </button>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <span className="text-xs text-primary-600 flex items-center gap-1 hover:text-primary-700">
          查看详情
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </div>
  );

  return showAssign;
}

export default function DutyBoard() {
  const { currentUser, workers, facilities, setWorkers, setFacilities, updateRepairOrder } = useAppStore();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [assignOrder, setAssignOrder] = useState<RepairOrder | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: { location?: string; assigneeId?: string } = {};
      if (selectedLocation) params.location = selectedLocation;
      if (selectedWorker) params.assigneeId = selectedWorker;

      const [data, wrks, facs] = await Promise.all([
        api.repairOrders.getBoard(params),
        api.workers.getAll('worker'),
        api.facilities.getAll(),
      ]);
      setBoardData(data);
      setWorkers(wrks);
      setFacilities(facs);
    } catch (error) {
      console.error('加载值班看板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLocation, selectedWorker]);

  const handleAssign = (order: RepairOrder) => {
    setAssignOrder(order);
  };

  const handleAssigned = (updated: RepairOrder) => {
    updateRepairOrder(updated);
    setAssignOrder(null);
    loadData();
  };

  const handleUrgent = async (order: RepairOrder) => {
    try {
      const updated = await api.repairOrders.markUrgent(order.id, {
        operatorName: currentUser?.name,
      });
      updateRepairOrder(updated);
      loadData();
    } catch (error) {
      console.error('催办失败:', error);
    }
  };

  const locations = useMemo(() => {
    const locSet = new Set<string>();
    facilities.forEach((f) => {
      if (f.location) locSet.add(f.location);
    });
    return Array.from(locSet);
  }, [facilities]);

  const summary = useMemo(() => {
    if (!boardData) return null;
    return {
      total: boardData.totalCount,
      pending: boardData.pending.length,
      repairing: boardData.repairing.length,
      nearOverdue: boardData.nearOverdue.length,
      overdue: boardData.overdue.length,
    };
  }, [boardData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">值班看板</h1>
          <p className="text-gray-500 mt-1">实时监控所有工单处理进度</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={'w-4 h-4' + (loading ? ' animate-spin' : '')} />
          刷新
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">未完成总计</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <p className="text-sm text-orange-600">待派单</p>
            <p className="text-2xl font-bold text-orange-700">{summary.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 bg-yellow-50/50 p-4">
            <p className="text-sm text-yellow-600">维修中</p>
            <p className="text-2xl font-bold text-yellow-700">{summary.repairing}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-sm text-amber-600">快超时</p>
            <p className="text-2xl font-bold text-amber-700">{summary.nearOverdue}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 bg-red-50/50 p-4">
            <p className="text-sm text-red-600">已超时</p>
            <p className="text-2xl font-bold text-red-700">{summary.overdue}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">区域筛选:</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部区域</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">值班师傅:</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部师傅</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          {(selectedLocation || selectedWorker) && (
            <button
              onClick={() => {
                setSelectedLocation('');
                setSelectedWorker('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {columns.map((col) => {
            const Icon = col.icon;
            const orders = boardData?.[col.key] || [];
            return (
              <div
                key={col.key}
                className={
                  'rounded-xl border p-4 min-h-[400px]' +
                  ' ' +
                  col.bgColor +
                  ' ' +
                  col.borderColor
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className={'w-5 h-5' + ' ' + col.color} />
                    <h3 className={'font-semibold' + ' ' + col.color}>
                      {col.label}
                    </h3>
                  </div>
                  <span
                    className={
                      'px-2 py-0.5 rounded-full text-xs font-bold bg-white ' +
                      col.color
                    }
                  >
                    {orders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      暂无工单
                    </div>
                  ) : (
                    orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onAssign={handleAssign}
                        onUrgent={handleUrgent}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assignOrder && (
        <AssignOrderModal
          order={assignOrder}
          onClose={() => setAssignOrder(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
