import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, QrCode, RefreshCw, MapPin, Search } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { FacilityIcon } from '../components/FacilityIcon';
import { Modal } from '../components/Modal';
import { FACILITY_TYPE_LABELS } from '../../shared/types';
import type { Facility, FacilityType } from '../../shared/types';

export default function FacilityManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'elevator' as FacilityType,
    location: '',
  });

  const { facilities, setFacilities, removeFacility, updateFacility, addFacility } = useAppStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.facilities.getAll();
      setFacilities(data);
    } catch (error) {
      console.error('获取设施列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredFacilities = facilities.filter((f) => {
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        f.name.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleOpenEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      type: facility.type as FacilityType,
      location: facility.location,
    });
    setShowFormModal(true);
  };

  const handleOpenAdd = () => {
    setEditingFacility(null);
    setFormData({ name: '', type: 'elevator', location: '' });
    setShowFormModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.location) {
      alert('请填写完整信息');
      return;
    }

    try {
      if (editingFacility) {
        const updated = await api.facilities.update(editingFacility.id, formData);
        updateFacility(updated);
      } else {
        const created = await api.facilities.create(formData);
        addFacility(created);
      }
      setShowFormModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该设施吗？')) return;
    try {
      await api.facilities.delete(id);
      removeFacility(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleShowQr = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowQrModal(true);
  };

  const reportUrl = selectedFacility
    ? `${window.location.origin}/report/${selectedFacility.id}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">设施管理</h1>
          <p className="text-gray-500 mt-1">共 {filteredFacilities.length} 个设施</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            添加设施
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
              placeholder="搜索设施名称、位置..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
          >
            <option value="all">全部类型</option>
            {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">暂无设施</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFacilities.map((facility, index) => (
            <div
              key={facility.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FacilityIcon type={facility.type as FacilityType} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{facility.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {facility.location}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {FACILITY_TYPE_LABELS[facility.type as FacilityType]}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-500">报修次数：</span>
                  <span className="font-semibold text-blue-600">{facility.repairCount || 0}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleShowQr(facility)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="查看二维码"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(facility)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(facility.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingFacility ? '编辑设施' : '添加设施'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              设施名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入设施名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              设施类型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FacilityType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              位置
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入设施位置"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowFormModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingFacility ? '保存修改' : '添加'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="设施报修二维码"
        size="sm"
      >
        {selectedFacility && (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{selectedFacility.name}</span>
            </p>
            <div className="inline-block p-4 bg-white rounded-xl border border-gray-200">
              <QRCodeCanvas value={reportUrl} size={200} level="H" />
            </div>
            <p className="text-xs text-gray-500 break-all px-4">{reportUrl}</p>
            <p className="text-xs text-gray-400">扫描二维码即可报修该设施</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(reportUrl);
                alert('链接已复制到剪贴板');
              }}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              复制链接
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
