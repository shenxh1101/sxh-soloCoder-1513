import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Wrench,
  RefreshCw,
  Filter,
  MapPin,
  Layers,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import type { Statistics as StatsType, FacilityType, StatisticsQuery } from '../../shared/types';
import { FACILITY_TYPE_LABELS } from '../../shared/types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f97316',
  assigned: '#3b82f6',
  repairing: '#eab308',
  completed: '#22c55e',
};

const FACILITY_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#8b5cf6',
  '#ec4899',
];

const MONTH_OPTIONS = [
  { value: '', label: '全部月份' },
  { value: '2025-01', label: '2025年1月' },
  { value: '2025-02', label: '2025年2月' },
  { value: '2025-03', label: '2025年3月' },
  { value: '2025-04', label: '2025年4月' },
  { value: '2025-05', label: '2025年5月' },
  { value: '2025-06', label: '2025年6月' },
  { value: '2025-07', label: '2025年7月' },
  { value: '2025-08', label: '2025年8月' },
  { value: '2025-09', label: '2025年9月' },
  { value: '2025-10', label: '2025年10月' },
  { value: '2025-11', label: '2025年11月' },
  { value: '2025-12', label: '2025年12月' },
];

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const { statistics, setStatistics } = useAppStore();
  const [filters, setFilters] = useState<StatisticsQuery>({
    facilityType: undefined,
    month: undefined,
    location: undefined,
  });
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  const fetchData = async (query?: StatisticsQuery) => {
    setLoading(true);
    try {
      const data = await api.statistics.get(query);
      setStatistics(data);
      if (data.locationRanking) {
        setAvailableLocations(data.locationRanking.map((item) => item.location));
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof StatisticsQuery, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({
      facilityType: undefined,
      month: undefined,
      location: undefined,
    });
  };

  const hasActiveFilters = filters.facilityType || filters.month || filters.location;

  const statusChartData = statistics?.statusDistribution.map((item) => ({
    name: item.label,
    value: item.count,
    status: item.status,
  })) || [];

  const facilityChartData = statistics?.facilityRanking.map((item) => ({
    name: item.facilityName.length > 8 ? item.facilityName.slice(0, 8) + '...' : item.facilityName,
    fullName: item.facilityName,
    count: item.count,
  })) || [];

  const facilityTypeChartData = statistics?.facilityTypeRanking.map((item) => ({
    name: item.facilityTypeLabel,
    count: item.count,
  })) || [];

  const locationChartData = statistics?.locationRanking.map((item) => ({
    name: item.location.length > 8 ? item.location.slice(0, 8) + '...' : item.location,
    fullName: item.location,
    count: item.count,
  })) || [];

  const workerChartData = statistics?.workerEfficiency.map((item) => ({
    name: item.workerName,
    avgHours: item.avgRepairHours,
    completed: item.completedCount,
  })) || [];

  const monthlyTrendData = statistics?.monthlyTrend.map((item) => ({
    name: item.month,
    count: item.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
          <p className="text-gray-500 mt-1">设施报修数据概览</p>
        </div>
        <button
          onClick={() => fetchData(filters)}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">数据筛选</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              清除筛选
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Layers className="w-4 h-4" />
              设施类型
            </label>
            <select
              value={filters.facilityType || ''}
              onChange={(e) => handleFilterChange('facilityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(FACILITY_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              月份
            </label>
            <select
              value={filters.month || ''}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              区域
            </label>
            <select
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            >
              <option value="">全部区域</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              {hasActiveFilters ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded">
                  <CheckCircle2 className="w-4 h-4" />
                  已筛选数据
                </span>
              ) : (
                <span className="text-gray-400">显示全部数据</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">总报修单</p>
              <p className="text-3xl font-bold mt-1">{statistics?.totalOrders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ListTodo className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">待处理</p>
              <p className="text-3xl font-bold mt-1">{statistics?.pendingOrders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">超时工单</p>
              <p className="text-3xl font-bold mt-1">{statistics?.overdueOrders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">平均维修时长</p>
              <p className="text-3xl font-bold mt-1">{statistics?.avgRepairHours || 0}<span className="text-lg ml-1">h</span></p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            月度报修趋势
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : monthlyTrendData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`${value} 单`, '报修数量']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            设施类型分布
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : facilityTypeChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={facilityTypeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {facilityTypeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={FACILITY_COLORS[index % FACILITY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 单`, '数量']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            区域报修排行 Top 10
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : locationChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationChartData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} 次`,
                    props.payload.fullName,
                  ]}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            设施报修排行 Top 10
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : facilityChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facilityChartData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} 次`,
                    props.payload.fullName,
                  ]}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            维修效率排行（平均耗时）
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : workerChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workerChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: '小时', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} 小时`, '平均维修时间']}
                />
                <Bar dataKey="avgHours" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-purple-600" />
            状态分布
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 单`, '数量']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            维修师傅详细数据
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statistics?.workerEfficiency.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">排名</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">师傅</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">完成数</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">平均耗时</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">效率评级</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics?.workerEfficiency.map((worker, index) => {
                    const avgHours = worker.avgRepairHours;
                    let rating = '一般';
                    let ratingColor = 'bg-gray-100 text-gray-700';
                    if (avgHours <= 2) {
                      rating = '优秀';
                      ratingColor = 'bg-green-100 text-green-700';
                    } else if (avgHours <= 4) {
                      rating = '良好';
                      ratingColor = 'bg-blue-100 text-blue-700';
                    } else if (avgHours <= 8) {
                      rating = '一般';
                      ratingColor = 'bg-yellow-100 text-yellow-700';
                    } else {
                      rating = '待提升';
                      ratingColor = 'bg-red-100 text-red-700';
                    }

                    return (
                      <tr key={worker.workerId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                              index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                ? 'bg-gray-100 text-gray-700'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-50 text-gray-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-900">{worker.workerName}</td>
                        <td className="py-3 px-2 text-right text-gray-600">{worker.completedCount} 单</td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-medium text-green-600">{worker.avgRepairHours} 小时</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ratingColor}`}>
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
