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
} from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import type { Statistics as StatsType } from '../../shared/types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f97316',
  assigned: '#3b82f6',
  repairing: '#eab308',
  completed: '#22c55e',
};

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const { statistics, setStatistics } = useAppStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.statistics.get();
      setStatistics(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const workerChartData = statistics?.workerEfficiency.map((item) => ({
    name: item.workerName,
    avgHours: item.avgRepairHours,
    completed: item.completedCount,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
          <p className="text-gray-500 mt-1">设施报修数据概览</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
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

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">今日完成</p>
              <p className="text-3xl font-bold mt-1">{statistics?.completedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">维修师傅</p>
              <p className="text-3xl font-bold mt-1">{statistics?.workerEfficiency.length || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
              <BarChart data={facilityChartData} layout="vertical">
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
                  innerRadius={60}
                  outerRadius={100}
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

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
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
                  </tr>
                </thead>
                <tbody>
                  {statistics?.workerEfficiency.map((worker, index) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
