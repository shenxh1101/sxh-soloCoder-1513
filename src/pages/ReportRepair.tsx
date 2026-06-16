import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wrench,
  MapPin,
  User,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Search,
  Clock,
  FileText,
  History,
  ArrowRight,
  Copy,
  Check,
  Image,
  Camera,
  MessageSquare,
  AlertTriangle,
  Zap,
  UserCheck,
} from 'lucide-react';
import { api } from '../utils/api';
import { PhotoUpload } from '../components/PhotoUpload';
import { FacilityIcon } from '../components/FacilityIcon';
import { StatusBadge } from '../components/StatusBadge';
import { FAULT_TYPES, FACILITY_TYPE_LABELS, STATUS_LABELS } from '../../shared/types';
import type { Facility, FacilityType, RepairOrder, OrderOperation } from '../../shared/types';
import { formatDateTime, formatDate } from '../utils/format';

const getOperationIcon = (type: OrderOperation['type']) => {
  switch (type) {
    case 'submit': return <FileText className="w-4 h-4" />;
    case 'assign': return <UserCheck className="w-4 h-4" />;
    case 'start': return <Zap className="w-4 h-4" />;
    case 'note': return <MessageSquare className="w-4 h-4" />;
    case 'photo': return <Camera className="w-4 h-4" />;
    case 'complete': return <CheckCircle2 className="w-4 h-4" />;
    case 'urgent': return <AlertTriangle className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getOperationLabel = (type: OrderOperation['type']) => {
  switch (type) {
    case 'submit': return '提交报修';
    case 'assign': return '派单';
    case 'start': return '开始维修';
    case 'note': return '追加备注';
    case 'photo': return '上传过程照片';
    case 'complete': return '完成维修';
    case 'urgent': return '催办';
    default: return type;
  }
};

const getOperationColor = (type: OrderOperation['type']) => {
  switch (type) {
    case 'submit': return 'bg-blue-500';
    case 'assign': return 'bg-purple-500';
    case 'start': return 'bg-amber-500';
    case 'note': return 'bg-gray-500';
    case 'photo': return 'bg-teal-500';
    case 'complete': return 'bg-green-500';
    case 'urgent': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export default function ReportRepair() {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<RepairOrder | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [faultType, setFaultType] = useState('');
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  const [showQuery, setShowQuery] = useState(false);
  const [queryPhone, setQueryPhone] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [userOrders, setUserOrders] = useState<RepairOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId) return;

    const fetchFacility = async () => {
      setLoading(true);
      try {
        const data = await api.facilities.getById(facilityId);
        setFacility(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取设施信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchFacility();
  }, [facilityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!faultType) {
      setError('请选择故障类型');
      return;
    }

    if (!photoBefore) {
      setError('请上传故障照片');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.repairOrders.create({
        facilityId: facilityId!,
        faultType,
        description,
        photoBefore,
        reporterName,
        reporterPhone: reporterPhone.trim(),
      });
      setSubmittedOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phone = queryPhone.trim();
    if (!phone) {
      setError('请输入手机号');
      return;
    }

    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的11位手机号');
      return;
    }

    setQueryLoading(true);
    try {
      const orders = await api.repairOrders.getByPhone(phone);
      setUserOrders(orders);
      setSelectedOrder(null);
      if (orders.length === 0) {
        setError('未找到该手机号的报修记录，请检查是否填写正确');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败，请稍后重试');
    } finally {
      setQueryLoading(false);
    }
  };

  const copyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const resetForm = () => {
    setFaultType('');
    setDescription('');
    setPhotoBefore('');
    setReporterName('');
    setReporterPhone('');
    setSubmittedOrder(null);
    setError('');
  };

  const toggleQueryMode = () => {
    setShowQuery(!showQuery);
    setQueryPhone('');
    setUserOrders([]);
    setSelectedOrder(null);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !facility && !showQuery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">设施不存在</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">提交成功！</h2>
          <p className="text-gray-500 mb-6">
            您的报修已提交，我们会尽快安排维修师傅处理。
          </p>

          <div className="bg-blue-50 rounded-xl p-5 mb-6 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">报修编号</span>
              <button
                onClick={() => copyOrderId(submittedOrder.id)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                {copied ? (
                  <><Check className="w-3 h-3" /> 已复制</>
                ) : (
                  <><Copy className="w-3 h-3" /> 复制</>
                )}
              </button>
            </div>
            <p className="text-xl font-bold text-blue-700 font-mono tracking-wide">
              {submittedOrder.id}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-3">
            <p className="text-sm">
              <span className="text-gray-500">设施：</span>
              <span className="font-medium text-gray-900">{facility?.name}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-500">故障：</span>
              <span className="font-medium text-gray-900">{faultType}</span>
            </p>
            {submittedOrder.expectedCompletion && (
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-gray-500">预计处理：</span>
                <span className="font-medium text-green-600">
                  {formatDate(submittedOrder.expectedCompletion)} 前完成
                </span>
              </p>
            )}
            {!submittedOrder.expectedCompletion && (
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-gray-500">预计处理：</span>
                <span className="font-medium text-blue-600">24小时内完成</span>
              </p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">温馨提示：</span>
              您可以再次扫码或拨打物业服务电话查询维修进度。如果留有手机号，也可以在下方"我的报修"中查看。
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              继续报修
            </button>
            {reporterPhone && (
              <button
                onClick={() => {
                  setQueryPhone(reporterPhone.trim());
                  setShowQuery(true);
                  setSubmittedOrder(null);
                }}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                查看我的报修
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showQuery) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => {
                if (viewingPhoto) {
                  setViewingPhoto(null);
                } else if (selectedOrder) {
                  setSelectedOrder(null);
                } else if (userOrders.length > 0) {
                  setUserOrders([]);
                } else {
                  toggleQueryMode();
                }
              }}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-gray-900">
              {viewingPhoto ? '查看照片' : selectedOrder ? '报修详情' : '我的报修'}
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {!selectedOrder && !userOrders.length && (
            <form onSubmit={handleQuery} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">查询报修记录</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    输入您报修时填写的手机号，查看历史报修记录
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    手机号
                  </label>
                  <input
                    type="tel"
                    value={queryPhone}
                    onChange={(e) => setQueryPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入11位手机号"
                    maxLength={11}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm mt-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={queryLoading || queryPhone.trim().length !== 11}
                  className="w-full py-3 mt-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Search className="w-5 h-5" />
                  {queryLoading ? '查询中...' : '查询报修记录'}
                </button>
              </div>

              <button
                type="button"
                onClick={toggleQueryMode}
                className="w-full py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
              >
                返回报修
              </button>
            </form>
          )}

          {!selectedOrder && userOrders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  找到 <span className="font-medium text-gray-900">{userOrders.length}</span> 条报修记录
                </p>
                <span className="text-sm text-blue-600 font-medium">{queryPhone}</span>
              </div>

              {userOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{order.facilityName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{order.id}</p>
                    </div>
                    <StatusBadge status={order.status} isOverdue={order.isOverdue} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{order.faultType}</span>
                    <span className="text-gray-400">{formatDateTime(order.createdAt)}</span>
                  </div>
                  {order.expectedCompletion && order.status !== 'completed' && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      预计 {formatDate(order.expectedCompletion)} 前完成
                    </div>
                  )}
                  {order.isNearOverdue && order.status !== 'completed' && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1 bg-amber-50 rounded px-2 py-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      即将超时，请留意处理进度
                    </div>
                  )}
                  <div className="flex items-center justify-end mt-2 text-blue-600 text-sm">
                    查看详情 <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              ))}

              <button
                onClick={toggleQueryMode}
                className="w-full py-2.5 text-gray-600 hover:text-gray-800 transition-colors mt-4"
              >
                返回报修
              </button>
            </div>
          )}

          {selectedOrder && !viewingPhoto && (
            <div className="space-y-4">
              {selectedOrder.isOverdue && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">工单已超时</span>
                    <span>，我们会尽快催促处理</span>
                  </p>
                </div>
              )}
              {selectedOrder.isNearOverdue && !selectedOrder.isOverdue && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">工单即将超时</span>
                    <span>，维修师傅正在处理中</span>
                  </p>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">报修编号</p>
                    <p className="font-mono font-medium text-gray-900">{selectedOrder.id}</p>
                  </div>
                  <StatusBadge status={selectedOrder.status} isOverdue={selectedOrder.isOverdue} />
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-sm">
                    <span className="text-gray-500">设施名称：</span>
                    <span className="font-medium text-gray-900">{selectedOrder.facilityName}</span>
                  </p>
                  {selectedOrder.facilityLocation && (
                    <p className="text-sm flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">位置：</span>
                      <span className="text-gray-900">{selectedOrder.facilityLocation}</span>
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="text-gray-500">故障类型：</span>
                    <span className="font-medium text-gray-900">{selectedOrder.faultType}</span>
                  </p>
                  {selectedOrder.description && (
                    <p className="text-sm">
                      <span className="text-gray-500">详细描述：</span>
                      <span className="text-gray-900">{selectedOrder.description}</span>
                    </p>
                  )}
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">提交时间：</span>
                    <span className="text-gray-900">{formatDateTime(selectedOrder.createdAt)}</span>
                  </p>
                  {selectedOrder.assigneeName && (
                    <p className="text-sm">
                      <span className="text-gray-500">维修师傅：</span>
                      <span className="font-medium text-gray-900">{selectedOrder.assigneeName}</span>
                    </p>
                  )}
                  {selectedOrder.expectedCompletion && selectedOrder.status !== 'completed' && (
                    <div className="bg-blue-50 rounded-lg p-3 mt-3">
                      <p className="text-sm text-blue-700 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        预计完成时间：{formatDate(selectedOrder.expectedCompletion)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        我们会在预计时间内完成维修，请耐心等待
                      </p>
                    </div>
                  )}
                  {selectedOrder.completedAt && (
                    <div className="bg-green-50 rounded-lg p-3 mt-3">
                      <p className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        完成时间：{formatDateTime(selectedOrder.completedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  处理进度
                </h3>
                {selectedOrder.operations && selectedOrder.operations.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                    {selectedOrder.operations.map((op, index) => (
                      <div key={op.id || index} className="relative flex gap-4 pb-5 last:pb-0">
                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getOperationColor(op.type)} text-white`}>
                          {getOperationIcon(op.type)}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="font-medium text-sm text-gray-900">
                            {getOperationLabel(op.type)}
                          </p>
                          {op.operatorName && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              操作人：{op.operatorName}
                              {op.operatorRole && ` (${op.operatorRole})`}
                            </p>
                          )}
                          {op.note && (
                            <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2">
                              {op.note}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(op.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                    {selectedOrder.timeline?.map((event, index) => (
                      <div key={index} className="relative flex gap-4 pb-5 last:pb-0">
                        <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          event.status === selectedOrder.status
                            ? 'bg-blue-500 ring-4 ring-blue-100'
                            : index < (selectedOrder.timeline?.findIndex(e => e.status === selectedOrder.status) || 0)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}>
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={`font-medium text-sm ${
                            event.status === selectedOrder.status ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {event.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(event.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 照片区域 */}
              <div className="space-y-4">
                {selectedOrder.photoBefore && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      故障照片
                    </h3>
                    <img
                      src={selectedOrder.photoBefore}
                      alt="故障照片"
                      onClick={() => setViewingPhoto(selectedOrder.photoBefore!)}
                      className="w-full rounded-lg aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                )}

                {selectedOrder.processPhotos && selectedOrder.processPhotos.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      维修过程照片
                      <span className="text-xs text-gray-500 font-normal">({selectedOrder.processPhotos.length}张)</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedOrder.processPhotos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={photo.photo}
                            alt={`过程照片${idx + 1}`}
                            onClick={() => setViewingPhoto(photo.photo)}
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          />
                          {photo.note && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{photo.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOrder.photoAfter && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      维修后照片
                    </h3>
                    <img
                      src={selectedOrder.photoAfter}
                      alt="维修后照片"
                      onClick={() => setViewingPhoto(selectedOrder.photoAfter!)}
                      className="w-full rounded-lg aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
              >
                返回列表
              </button>
            </div>
          )}

          {viewingPhoto && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
              <img
                src={viewingPhoto}
                alt="放大照片"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setViewingPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const faultOptions = facility ? FAULT_TYPES[facility.type as FacilityType] || FAULT_TYPES.other : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">设施报修</h1>
          <button
            onClick={toggleQueryMode}
            className="ml-auto flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <History className="w-4 h-4" />
            我的报修
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {facility && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-start gap-4">
              <FacilityIcon type={facility.type as FacilityType} className="w-12 h-12" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{facility.name}</h2>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {facility.location}
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {FACILITY_TYPE_LABELS[facility.type as FacilityType]}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              故障信息
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  故障类型 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {faultOptions.map((fault) => (
                    <button
                      key={fault}
                      type="button"
                      onClick={() => setFaultType(fault)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        faultType === fault
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {fault}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请详细描述故障情况..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <PhotoUpload
                value={photoBefore}
                onChange={setPhotoBefore}
                label="故障照片 *"
                placeholder="点击上传故障现场照片"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              您的信息
              <span className="text-xs text-gray-400 font-normal ml-1">
                （填写手机号可查询维修进度）
              </span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  联系电话
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入11位手机号（方便查询进度）"
                  maxLength={11}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            <Send className="w-5 h-5" />
            {submitting ? '提交中...' : '提交报修'}
          </button>
        </form>
      </div>
    </div>
  );
}
