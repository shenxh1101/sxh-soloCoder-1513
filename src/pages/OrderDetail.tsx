import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  UserCheck,
  Wrench,
  FileImage,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getTimeUntilOverdue, getDurationHours, formatDate } from '../utils/format';
import { RepairOrder, TimelineEvent, FACILITY_TYPE_LABELS } from '../../shared/types';
import { AssignOrderModal } from '../components/AssignOrderModal';

const iconMap: Record<string, React.ElementType> = {
  'clipboard-list': ClipboardList,
  'user-check': UserCheck,
  'wrench': Wrench,
  'check-circle': CheckCircle,
};

const statusColorMap: Record<string, string> = {
  pending: 'bg-orange-500',
  assigned: 'bg-blue-500',
  repairing: 'bg-yellow-500',
  completed: 'bg-green-500',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, updateRepairOrder } = useAppStore();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await api.repairOrders.getById(id!);
      setOrder(data);
    } catch (error) {
      console.error('加载报修单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRepair = async () => {
    if (!order) return;
    try {
      const updated = await api.repairOrders.start(order.id);
      setOrder(updated);
      updateRepairOrder(updated);
    } catch (error) {
      console.error('开始维修失败:', error);
    }
  };

  const handleCompleteRepair = async (photoAfter: string) => {
    if (!order) return;
    try {
      const updated = await api.repairOrders.complete(order.id, { photoAfter });
      setOrder(updated);
      updateRepairOrder(updated);
    } catch (error) {
      console.error('完成维修失败:', error);
    }
  };

  const handleAssigned = (updated: RepairOrder) => {
    setOrder(updated);
    updateRepairOrder(updated);
    setShowAssignModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <p className="text-gray-600 mb-4">报修单不存在</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  const overdueInfo = getTimeUntilOverdue(order.createdAt);
  const isAssignedToCurrentUser = currentUser && order.assigneeId === currentUser.id;
  const canAssign = currentUser?.role === 'admin' && order.status === 'pending';
  const canStart = isAssignedToCurrentUser && order.status === 'assigned';
  const canComplete = isAssignedToCurrentUser && order.status === 'repairing';

  const calculateTotalDuration = () => {
    if (!order.completedAt) return null;
    return getDurationHours(order.createdAt, order.completedAt);
  };

  const getCurrentStep = () => {
    const statusOrder = ['pending', 'assigned', 'repairing', 'completed'];
    return statusOrder.indexOf(order.status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">报修单详情</h1>
              <p className="text-sm text-gray-500">编号：{order.id}</p>
            </div>
            <StatusBadge status={order.status} isOverdue={order.isOverdue} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {order.facilityName}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {order.facilityType && (
                  <span className="px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                    {FACILITY_TYPE_LABELS[order.facilityType]}
                  </span>
                )}
                {order.facilityLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{order.facilityLocation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 mb-1">故障类型</p>
            <p className="font-medium text-gray-900">{order.faultType}</p>
          </div>

          {order.description && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">详细描述</p>
              <p className="text-gray-700">{order.description}</p>
            </div>
          )}

          {/* 超时提醒 */}
          {order.isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-pulse">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{overdueInfo.remainingText}</span>
              </div>
            </div>
          )}

          {/* 报修人信息 */}
          {(order.reporterName || order.reporterPhone) && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">报修人信息</p>
              <div className="flex flex-wrap gap-4">
                {order.reporterName && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    <span>{order.reporterName}</span>
                  </div>
                )}
                {order.reporterPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" />
                    <span>{order.reporterPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 维修师傅信息 */}
          {order.assigneeName && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">负责师傅</p>
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="font-medium">{order.assigneeName}</span>
              </div>
            </div>
          )}

          {/* 预计处理时间 */}
          {order.expectedCompletion && order.status !== 'completed' && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  预计完成时间：{formatDate(order.expectedCompletion)}
                </span>
              </div>
            </div>
          )}

          {/* 总耗时 */}
          {order.completedAt && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  总处理时长：{calculateTotalDuration()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 照片卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            照片记录
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">故障照片</p>
              <div
                className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowPhotoModal(order.photoBefore)}
              >
                <img
                  src={order.photoBefore}
                  alt="故障照片"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">维修后照片</p>
              {order.photoAfter ? (
                <div
                  className="aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowPhotoModal(order.photoAfter!)}
                >
                  <img
                    src={order.photoAfter}
                    alt="维修后照片"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <span className="text-sm">暂无照片</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 时间线卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            处理时间线
          </h3>
          <div className="relative">
            {/* 时间线 */}
            <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            {order.timeline?.map((event: TimelineEvent, index: number) => {
              const IconComponent = iconMap[event.icon] || Clock;
              const isCompleted = index <= getCurrentStep();
              const isCurrent = index === getCurrentStep();
              
              return (
                <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                  <div
                    className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? statusColorMap[event.status] : 'bg-gray-300'
                    } ${isCurrent ? 'ring-4 ring-offset-2 ring-blue-200' : ''}`}
                  >
                    <IconComponent className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {event.label}
                      </h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          当前步骤
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(event.time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 pb-6">
          {canAssign && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5" />
              派单
            </button>
          )}
          {canStart && (
            <button
              onClick={handleStartRepair}
              className="flex-1 md:flex-none px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
            >
              <Wrench className="w-5 h-5" />
              开始维修
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => {
                const photoUrl = prompt('请输入维修完成照片链接（或上传后使用）');
                if (photoUrl) {
                  handleCompleteRepair(photoUrl);
                }
              }}
              className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              完成维修
            </button>
          )}
        </div>
      </div>

      {/* 派单弹窗 */}
      {showAssignModal && order && (
        <AssignOrderModal
          order={order}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}

      {/* 照片查看弹窗 */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={showPhotoModal}
              alt="查看大图"
              className="max-w-full max-h-screen object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
