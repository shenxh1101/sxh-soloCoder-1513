import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { UserCheck, Clock, Wrench, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import type { RepairOrder, WorkerWorkload } from '../../shared/types';
import { useAppStore } from '../store';

interface AssignOrderModalProps {
  order: RepairOrder;
  onClose: () => void;
  onAssigned: (order: RepairOrder) => void;
}

export function AssignOrderModal({ order, onClose, onAssigned }: AssignOrderModalProps) {
  const [workerWorkloads, setWorkerWorkloads] = useState<WorkerWorkload[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWorkload, setLoadingWorkload] = useState(true);
  const { updateRepairOrder } = useAppStore();

  useEffect(() => {
    loadWorkerWorkloads();
  }, []);

  const loadWorkerWorkloads = async () => {
    try {
      setLoadingWorkload(true);
      const data = await api.workers.getWorkload();
      setWorkerWorkloads(data);
    } catch (error) {
      console.error('加载师傅负载信息失败:', error);
    } finally {
      setLoadingWorkload(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedWorker) return;
    const worker = workerWorkloads.find((w) => w.id === selectedWorker);
    if (!worker) return;

    try {
      setLoading(true);
      const updated = await api.repairOrders.assign(order.id, {
        assigneeId: worker.id,
        assigneeName: worker.name,
      });
      updateRepairOrder(updated);
      onAssigned(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : '派单失败');
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadLevel = (total: number) => {
    if (total === 0) return { label: '空闲', color: 'text-green-600 bg-green-50 border-green-200' };
    if (total <= 2) return { label: '正常', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (total <= 4) return { label: '较忙', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    return { label: '繁忙', color: 'text-red-600 bg-red-50 border-red-200' };
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-gray-300';
  };

  const sortedWorkers = [...workerWorkloads].sort((a, b) => {
    if (a.totalUncompleted !== b.totalUncompleted) {
      return a.totalUncompleted - b.totalUncompleted;
    }
    return a.avgRepairHours - b.avgRepairHours;
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="派单给维修师傅"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">工单信息</h4>
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">设施：</span>{order.facilityName}</p>
            <p><span className="font-medium">故障：</span>{order.faultType}</p>
            {order.description && <p><span className="font-medium">描述：</span>{order.description}</p>}
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p>系统已按当前负载和维修效率自动排序，建议优先派单给负载低、效率高的师傅</p>
        </div>

        {loadingWorkload ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedWorkers.map((worker, index) => {
              const workloadInfo = getWorkloadLevel(worker.totalUncompleted);
              const isSelected = selectedWorker === worker.id;
              const totalUncompletedClass = worker.totalUncompleted > 4 ? 'text-red-600' : 'text-gray-900';
              
              return (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorker(worker.id)}
                  className={'relative border-2 rounded-xl p-4 cursor-pointer transition-all ' + (
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  )}
                >
                  {index < 3 && (
                    <div className="absolute top-3 right-3">
                      <Award className={'w-6 h-6 ' + getMedalColor(index)} />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-xl font-bold text-primary-700 flex-shrink-0">
                      {worker.name.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{worker.name}</h5>
                        <span className={'px-2 py-0.5 text-xs font-medium rounded-full border ' + workloadInfo.color}>
                          {workloadInfo.label}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">待处理</p>
                          <p className="text-lg font-bold text-gray-900">{worker.pendingCount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">维修中</p>
                          <p className="text-lg font-bold text-yellow-600">{worker.inProgressCount}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">未完成</p>
                          <p className={'text-lg font-bold ' + totalUncompletedClass}>
                            {worker.totalUncompleted}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span>平均耗时：</span>
                          <span className="font-medium">{worker.avgRepairHours}小时</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>近7天完成：</span>
                          <span className="font-medium">{worker.last7DaysCompleted}单</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-3 left-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedWorker || loading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            {loading ? '派单中...' : '确认派单'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
