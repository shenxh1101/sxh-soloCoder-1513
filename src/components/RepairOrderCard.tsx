import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  User,
  Phone,
  MapPin,
  Wrench,
  CheckCircle2,
  Play,
  Send,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import type { RepairOrder, Worker } from '../../shared/types';
import { StatusBadge } from './StatusBadge';
import { FacilityIcon } from './FacilityIcon';
import { formatDateTime, getTimeUntilOverdue, getDurationHours } from '../utils/format';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { Modal } from './Modal';
import { PhotoUpload } from './PhotoUpload';
import { AssignOrderModal } from './AssignOrderModal';

interface RepairOrderCardProps {
  order: RepairOrder;
  workers: Worker[];
}

export function RepairOrderCard({ order, workers }: RepairOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [photoAfter, setPhotoAfter] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { updateRepairOrder, currentUser } = useAppStore();

  const overdueInfo = getTimeUntilOverdue(order.createdAt);

  const handleAssigned = (updated: RepairOrder) => {
    updateRepairOrder(updated);
    setShowAssignModal(false);
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      const updated = await api.repairOrders.start(order.id);
      updateRepairOrder(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!photoAfter) {
      alert('请上传维修完成照片');
      return;
    }

    try {
      setLoading(true);
      const updated = await api.repairOrders.complete(order.id, { photoAfter });
      updateRepairOrder(updated);
      setShowCompleteModal(false);
      setPhotoAfter('');
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const isAssignedToCurrentUser = currentUser?.id === order.assigneeId;
  const canAssign = currentUser?.role === 'admin' && order.status === 'pending';
  const canStart = isAssignedToCurrentUser && order.status === 'assigned';
  const canComplete = isAssignedToCurrentUser && order.status === 'repairing';

  const cardClass = order.isOverdue && order.status !== 'completed'
    ? 'bg-white border-2 border-red-300 shadow-lg shadow-red-100/50'
    : 'bg-white border border-gray-200 hover:shadow-md';

  return (
    <>
      <div
        className={`rounded-xl overflow-hidden transition-all duration-300 ${cardClass}`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <FacilityIcon type="elevator" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-900 truncate">
                    {order.facilityName}
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">{order.faultType}</p>
                </div>
                <StatusBadge status={order.status} isOverdue={order.isOverdue} />
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-600 line-clamp-2">
            {order.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            {order.reporterName && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{order.reporterName}</span>
              </div>
            )}
            {order.assigneeName && (
              <div className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>{order.assigneeName}</span>
              </div>
            )}
          </div>

          {order.isOverdue && order.status !== 'completed' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="font-medium">{overdueInfo.remainingText}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {expanded ? (
                  <>
                    收起 <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    展开 <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                完整详情
              </button>
            </div>

            <div className="flex gap-2">
              {canAssign && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  派单
                </button>
              )}
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  开始维修
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  完成维修
                </button>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4 animate-in slide-in-from-top duration-200">
            {order.photoBefore && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  故障照片
                </p>
                <img
                  src={order.photoBefore}
                  alt="故障照片"
                  className="w-full max-w-md h-40 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}

            {order.photoAfter && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  维修完成照片
                </p>
                <img
                  src={order.photoAfter}
                  alt="维修完成照片"
                  className="w-full max-w-md h-40 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {order.reporterPhone && (
                <div>
                  <p className="text-gray-500">联系电话</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {order.reporterPhone}
                  </p>
                </div>
              )}
              {order.assignedAt && (
                <div>
                  <p className="text-gray-500">派单时间</p>
                  <p className="font-medium text-gray-900">{formatDateTime(order.assignedAt)}</p>
                </div>
              )}
              {order.completedAt && order.assignedAt && (
                <div>
                  <p className="text-gray-500">维修耗时</p>
                  <p className="font-medium text-gray-900">
                    {getDurationHours(order.assignedAt, order.completedAt)}
                  </p>
                </div>
              )}
              {order.completedAt && (
                <div>
                  <p className="text-gray-500">完成时间</p>
                  <p className="font-medium text-gray-900">{formatDateTime(order.completedAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <AssignOrderModal
          order={order}
          onClose={() => setShowAssignModal(false)}
          onAssigned={handleAssigned}
        />
      )}

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="完成维修"
        size="md"
      >
        <div className="space-y-4">
          <PhotoUpload
            value={photoAfter}
            onChange={setPhotoAfter}
            label="上传维修完成照片"
            placeholder="请上传维修完成后的照片"
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCompleteModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleComplete}
              disabled={!photoAfter || loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '提交中...' : '确认完成'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
