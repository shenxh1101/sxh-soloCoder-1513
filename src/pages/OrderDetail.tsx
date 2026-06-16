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
  MessageSquare,
  Camera,
  BellRing,
  X,
  Plus,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, getTimeUntilOverdue, getDurationHours, formatDate } from '../utils/format';
import { RepairOrder, TimelineEvent, FACILITY_TYPE_LABELS, OrderOperation, OperationType } from '../../shared/types';
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

const operationIconMap: Record<OperationType, React.ElementType> = {
  submit: ClipboardList,
  assign: UserCheck,
  start: Wrench,
  note: MessageSquare,
  photo: Camera,
  complete: CheckCircle,
  urgent: BellRing,
};

const operationColorMap: Record<OperationType, string> = {
  submit: 'bg-orange-100 text-orange-600',
  assign: 'bg-blue-100 text-blue-600',
  start: 'bg-yellow-100 text-yellow-600',
  note: 'bg-gray-100 text-gray-600',
  photo: 'bg-purple-100 text-purple-600',
  complete: 'bg-green-100 text-green-600',
  urgent: 'bg-red-100 text-red-600',
};

const operationLabelMap: Record<OperationType, string> = {
  submit: '提交报修',
  assign: '派单',
  start: '开始维修',
  note: '备注',
  photo: '上传照片',
  complete: '维修完成',
  urgent: '催办',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, updateRepairOrder } = useAppStore();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showProcessPhotoModal, setShowProcessPhotoModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [processPhotoUrl, setProcessPhotoUrl] = useState('');
  const [processPhotoDesc, setProcessPhotoDesc] = useState('');
  const [completePhotoUrl, setCompletePhotoUrl] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [startNote, setStartNote] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitting(true);
      const updated = await api.repairOrders.start(order.id, {
        operatorName: currentUser?.name,
        note: startNote || undefined,
      });
      setOrder(updated);
      updateRepairOrder(updated);
      setShowStartModal(false);
      setStartNote('');
    } catch (error) {
      console.error('开始维修失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!order || !noteText.trim()) return;
    try {
      setSubmitting(true);
      const updated = await api.repairOrders.addNote(order.id, {
        operatorName: currentUser?.name || '系统',
        operatorRole: currentUser?.role,
        note: noteText.trim(),
      });
      setOrder(updated);
      updateRepairOrder(updated);
      setShowNoteModal(false);
      setNoteText('');
    } catch (error) {
      console.error('添加备注失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProcessPhoto = async () => {
    if (!order || !processPhotoUrl.trim()) return;
    try {
      setSubmitting(true);
      const updated = await api.repairOrders.addPhoto(order.id, {
        operatorName: currentUser?.name || '系统',
        photo: processPhotoUrl.trim(),
        description: processPhotoDesc.trim() || undefined,
      });
      setOrder(updated);
      updateRepairOrder(updated);
      setShowProcessPhotoModal(false);
      setProcessPhotoUrl('');
      setProcessPhotoDesc('');
    } catch (error) {
      console.error('上传照片失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRepair = async () => {
    if (!order || !completePhotoUrl.trim()) return;
    try {
      setSubmitting(true);
      const updated = await api.repairOrders.complete(order.id, {
        photoAfter: completePhotoUrl.trim(),
        operatorName: currentUser?.name,
        note: completeNote.trim() || undefined,
      });
      setOrder(updated);
      updateRepairOrder(updated);
      setShowCompleteModal(false);
      setCompletePhotoUrl('');
      setCompleteNote('');
    } catch (error) {
      console.error('完成维修失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkUrgent = async () => {
    if (!order) return;
    try {
      const updated = await api.repairOrders.markUrgent(order.id, {
        operatorName: currentUser?.name,
      });
      setOrder(updated);
      updateRepairOrder(updated);
    } catch (error) {
      console.error('催办失败:', error);
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
  const canProcess = isAssignedToCurrentUser && (order.status === 'assigned' || order.status === 'repairing');
  const canComplete = isAssignedToCurrentUser && order.status === 'repairing';
  const canUrgent = currentUser?.role === 'admin' && order.status !== 'completed' && order.isOverdue;

  const calculateTotalDuration = () => {
    if (!order.completedAt) return null;
    return getDurationHours(order.createdAt, order.completedAt);
  };

  const getCurrentStep = () => {
    const statusOrder = ['pending', 'assigned', 'repairing', 'completed'];
    return statusOrder.indexOf(order.status);
  };

  const allPhotos = [
    ...(order.photoBefore ? [{ url: order.photoBefore, label: '故障照片' }] : []),
    ...(order.processPhotos || []).map((p, idx) => ({ url: p.photo, label: p.note || `过程照片${idx + 1}` })),
    ...(order.photoAfter ? [{ url: order.photoAfter, label: '维修完成照片' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
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

          {order.isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-pulse">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{overdueInfo.remainingText}</span>
              </div>
            </div>
          )}

          {!order.isOverdue && order.isNearOverdue && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="w-5 h-5" />
                <span className="font-medium">即将超时：{overdueInfo.remainingText}</span>
              </div>
            </div>
          )}

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

          {order.assigneeName && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">负责师傅</p>
              <div className="flex items-center gap-2 text-gray-700">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="font-medium">{order.assigneeName}</span>
              </div>
            </div>
          )}

          {order.expectedCompletion && order.status !== 'completed' && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  预计完成时间：{formatDate(order.expectedCompletion)}（提交后8小时内）
                </span>
              </div>
            </div>
          )}

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

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              照片记录
              <span className="text-sm font-normal text-gray-500">（{allPhotos.length}张）</span>
            </h3>
            {canProcess && (
              <button
                onClick={() => setShowProcessPhotoModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                上传过程照片
              </button>
            )}
          </div>
          {allPhotos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">暂无照片</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowPhotoModal(photo.url)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                    {photo.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              处理时间线
            </h3>
            {(canProcess || currentUser?.role === 'admin') && order.status !== 'completed' && (
              <button
                onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                添加备注
              </button>
            )}
          </div>

          {order.operations && order.operations.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
              {order.operations.map((op: OrderOperation, index: number) => {
                const OpIcon = operationIconMap[op.type] || MessageSquare;
                return (
                  <div key={op.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div className={'relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ' + operationColorMap[op.type]}>
                      <OpIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {operationLabelMap[op.type]}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {op.operatorName}
                          {op.operatorRole === 'admin' && '（管理）'}
                          {op.operatorRole === 'worker' && '（师傅）'}
                          {op.operatorRole === 'reporter' && '（报修人）'}
                        </span>
                      </div>
                      {op.note && (
                        <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-1">
                          {op.note}
                        </p>
                      )}
                      {op.photo && (
                        <div
                          className="w-20 h-20 rounded overflow-hidden cursor-pointer mb-1"
                          onClick={() => setShowPhotoModal(op.photo!)}
                        >
                          <img src={op.photo} alt="操作照片" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(op.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            order.timeline && (
              <div className="relative">
                <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
                {order.timeline.map((event: TimelineEvent, index: number) => {
                  const IconComponent = iconMap[event.icon] || Clock;
                  const isCompleted = index <= getCurrentStep();
                  const isCurrent = index === getCurrentStep();
                  
                  return (
                    <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
                      <div
                        className={
                          'relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ' +
                          (isCompleted ? statusColorMap[event.status] : 'bg-gray-300') +
                          (isCurrent ? ' ring-4 ring-offset-2 ring-blue-200' : '')
                        }
                      >
                        <IconComponent className={'w-5 h-5 ' + (isCompleted ? 'text-white' : 'text-gray-500')} />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={'font-semibold ' + (isCompleted ? 'text-gray-900' : 'text-gray-400')}>
                            {event.label}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              当前步骤
                            </span>
                          )}
                        </div>
                        <p className={'text-sm ' + (isCompleted ? 'text-gray-600' : 'text-gray-400')}>
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
            )
          )}
        </div>

        <div className="flex flex-wrap gap-3">
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
              onClick={() => setShowStartModal(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
            >
              <Wrench className="w-5 h-5" />
              开始维修
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="flex-1 md:flex-none px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              完成维修
            </button>
          )}
          {canUrgent && (
            <button
              onClick={handleMarkUrgent}
              className="flex-1 md:flex-none px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <BellRing className="w-5 h-5" />
              催办
            </button>
          )}
        </div>
      </div>

      {showAssignModal && order && (
        <AssignOrderModal
          order={order}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}

      {showPhotoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoModal(null)}
        >
          <div className="max-w-4xl max-h-full relative">
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              onClick={() => setShowPhotoModal(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={showPhotoModal}
              alt="查看大图"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">添加备注</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="输入备注内容..."
              className="w-full h-32 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || submitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {showProcessPhotoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">上传过程照片</h3>
              <button onClick={() => setShowProcessPhotoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">照片链接</label>
                <input
                  type="text"
                  value={processPhotoUrl}
                  onChange={(e) => setProcessPhotoUrl(e.target.value)}
                  placeholder="输入图片URL"
                  className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setProcessPhotoUrl('https://picsum.photos/600/400')}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                >
                  使用示例图片
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">照片说明（可选）</label>
                <input
                  type="text"
                  value={processPhotoDesc}
                  onChange={(e) => setProcessPhotoDesc(e.target.value)}
                  placeholder="描述维修过程..."
                  className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowProcessPhotoModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddProcessPhoto}
                disabled={!processPhotoUrl.trim() || submitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                上传
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">开始现场维修</h3>
              <button onClick={() => setShowStartModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">现场情况说明（可选）</label>
              <textarea
                value={startNote}
                onChange={(e) => setStartNote(e.target.value)}
                placeholder="记录现场情况..."
                className="w-full h-24 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleStartRepair}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                确认开始
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">完成维修</h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">维修完成照片 *</label>
                <input
                  type="text"
                  value={completePhotoUrl}
                  onChange={(e) => setCompletePhotoUrl(e.target.value)}
                  placeholder="输入图片URL"
                  className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setCompletePhotoUrl('https://picsum.photos/600/400')}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                >
                  使用示例图片
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">维修说明（可选）</label>
                <textarea
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="描述维修内容和结果..."
                  className="w-full h-24 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCompleteRepair}
                disabled={!completePhotoUrl.trim() || submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
