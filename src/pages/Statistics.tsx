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
  Flame,
  ChevronRight,
} from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import type { Statistics as StatsType, FacilityType, StatisticsQuery, HotspotData, HotspotTimeRange } from '../../shared/types';
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

const generateMonthOptions = () => {
  const options = [{ value: '', label: '全部月份' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.toISOString().slice(0, 7);
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value: val, label });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

const TIME_RANGE_OPTIONS: { value: HotspotTimeRange; label: string }[] = [
  { value: '7d', label: '最近7天' },
  { value: '30d', label: '最近30天' },
  { value: 'month', label: '本月' },
];

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const { statistics, setStatistics } = useAppStore();
  const [hotspot, setHotspot] = useState<HotspotData | null>(null);
  const [timeRange, setTimeRange] = useState<HotspotTimeRange>('7d');
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
      if (data.locationRanking && data.locationRanking.length > 0) {
        setAvailableLocations(data.locationRanking.map((item) => item.location));
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHotspot = async (range: HotspotTimeRange) => {
    setHotspotLoading(true);
    try {
      const data = await api.statistics.getHotspot(range);
      setHotspot(data);
    } catch (error) {
      console.error('获取热点数据失败:', error);
    } finally {
      setHotspotLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHotspot(timeRange);
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  useEffect(() => {
    fetchHotspot(timeRange);
  }, [timeRange]);

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

  const statusChartData = (statistics?.statusDistribution || [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.label,
      value: item.count,
      status: item.status,
    }));

  const facilityChartData = (statistics?.facilityRanking || []).slice(0, 10).map((item) => ({
    name: item.facilityName.length > 8 ? item.facilityName.slice(0, 8) + '...' : item.facilityName,
    fullName: item.facilityName,
    count: item.count,
  }));

  const facilityTypeChartData = (statistics?.facilityTypeRanking || []).map((item) => ({
    name: item.facilityTypeLabel,
    count: item.count,
  }));

  const locationChartData = (statistics?.locationRanking || []).slice(0, 10).map((item) => ({
    name: item.location.length > 8 ? item.location.slice(0, 8) + '...' : item.location,
    fullName: item.location,
    count: item.count,
  }));

  const workerChartData = (statistics?.workerEfficiency || []).map((item) => ({
    name: item.workerName,
    avgHours: item.avgRepairHours,
    completed: item.completedCount,
  }));

  const monthlyTrendData = (statistics?.monthlyTrend || []).map((item) => ({
    name: item.month,
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
          <p className="text-gray-500 mt-1">设施报修数据概览</p>
        </div>
        <button
          onClick={() => {
            fetchData(filters);
            fetchHotspot(timeRange);
          }}
          disabled={loading || hotspotLoading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={'w-5 h-5 ' + ((loading || hotspotLoading) ? 'animate-spin' : '')} />
        </button>
      </div>

      {/* 问题热点视图 */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">问题热点视图</h3>
              <p className="text-xs text-gray-500">方便早会快速查看重点问题</p>
            </div>
          </div>
          <div className="flex gap-1 bg-white rounded-lg p-1 border border-orange-200">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' +
                  (timeRange === opt.value
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-orange-50')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {hotspotLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-red-500" />
                报修最多的区域
              </p>
              {hotspot?.topLocations.length === 0 ? (
                <p className="text-sm text-gray-400">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {hotspot?.topLocations.map((loc, idx) => (
                    <div key={loc.location} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={
                          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ' +
                          (idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-orange-500 text-white' : idx === 2 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600')
                        }>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 truncate max-w-[140px]">{loc.location}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{loc.count}单</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <Layers className="w-4 h-4 text-blue-500" />
                报修最多的设备类型
              </p>
              {hotspot?.topFacilityTypes.length === 0 ? (
                <p className="text-sm text-gray-400">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {hotspot?.topFacilityTypes.map((ft, idx) => (
                    <div key={ft.facilityType} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={
                          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ' +
                          (idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-orange-500 text-white' : idx === 2 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600')
                        }>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700">{ft.facilityTypeLabel}</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{ft.count}单</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                <Wrench className="w-4 h-4 text-purple-500" />
                报修最多的设施
              </p>
              {hotspot?.topFacilities.length === 0 ? (
                <p className="text-sm text-gray-400">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {hotspot?.topFacilities.map((f, idx) => (
                    <div key={f.facilityId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={
                          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ' +
                          (idx === 0 ? 'bg-red-500 text-white' : idx === 1 ? 'bg-orange-500 text-white' : idx === 2 ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600')
                        }>
                          {idx + 1}
                        </span>
                        <span className="text-sm text-gray-700 truncate max-w-[140px]">{f.facilityName}</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600">{f.count}单</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 筛选器 */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* 图表区域 */}
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
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
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
              <BarChart data={locationChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={90}
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
              <BarChart data={facilityChartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={90}
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
                  allowDecimals={false}
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
          ) : statusChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              暂无数据
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
          ) : !statistics?.workerEfficiency || statistics.workerEfficiency.length === 0 ? (
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
                  {statistics.workerEfficiency.map((worker, index) => {
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
                            className={
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ' +
                              (index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                ? 'bg-gray-100 text-gray-700'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-50 text-gray-500')
                            }
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
                          <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' + ratingColor}>
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
