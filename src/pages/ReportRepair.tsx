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
} from 'lucide-react';
import { api } from '../utils/api';
import { PhotoUpload } from '../components/PhotoUpload';
import { FacilityIcon } from '../components/FacilityIcon';
import { FAULT_TYPES, FACILITY_TYPE_LABELS } from '../../shared/types';
import type { Facility, FacilityType } from '../../shared/types';

export default function ReportRepair() {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [faultType, setFaultType] = useState('');
  const [description, setDescription] = useState('');
  const [photoBefore, setPhotoBefore] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

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
      await api.repairOrders.create({
        facilityId: facilityId!,
        faultType,
        description,
        photoBefore,
        reporterName,
        reporterPhone,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !facility) {
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">提交成功！</h2>
          <p className="text-gray-500 mb-6">
            您的报修已提交，我们会尽快安排维修师傅处理。感谢您的反馈！
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              <span className="font-medium">设施：</span>{facility?.name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">故障：</span>{faultType}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            继续报修
          </button>
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
              您的信息（选填）
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
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="请输入您的联系电话"
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
