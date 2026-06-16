import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/Tabs';
import { Briefcase, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { useAppStore } from '../store';
import { RepairOrderCard } from '../components/RepairOrderCard';
import type { RepairOrder } from '../../shared/types';

export default function Workbench() {
  const [loading, setLoading] = useState(false);
  const { currentUser, repairOrders, workers, setRepairOrders, setWorkers } = useAppStore();

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [orders, wrks] = await Promise.all([
        api.repairOrders.getAll({ assigneeId: currentUser.id }),
        api.workers.getAll('worker'),
      ]);
      setRepairOrders(orders);
      setWorkers(wrks);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const pendingOrders = repairOrders.filter(
    (o) => o.status === 'assigned' || o.status === 'repairing'
  );
  const completedOrders = repairOrders.filter((o) => o.status === 'completed');
  const overdueOrders = repairOrders.filter(
    (o) => o.isOverdue && o.status !== 'completed'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的工作台</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{currentUser?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理工单</p>
              <p className="text-2xl font-bold text-gray-900">{pendingOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已完成</p>
              <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-5 ${overdueOrders.length > 0 ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${overdueOrders.length > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <AlertTriangle className={`w-6 h-6 ${overdueOrders.length > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">超时工单</p>
              <p className={`text-2xl font-bold ${overdueOrders.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {overdueOrders.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            待处理
            {pendingOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {pendingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            已完成
            {completedOrders.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {completedOrders.length}
              </span>
            )}
          </TabsTrigger>
          {overdueOrders.length > 0 && (
            <TabsTrigger value="overdue" className="text-red-600">
              已超时
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full animate-pulse">
                {overdueOrders.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-gray-500">暂无待处理工单</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOrders
                .sort((a, b) => {
                  if (a.isOverdue && !b.isOverdue) return -1;
                  if (!a.isOverdue && b.isOverdue) return 1;
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                })
                .map((order, index) => (
                  <div
                    key={order.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <RepairOrderCard order={order} workers={workers} />
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : completedOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无已完成工单</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedOrders
                .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                .map((order, index) => (
                  <div
                    key={order.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <RepairOrderCard order={order} workers={workers} />
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {overdueOrders.length > 0 && (
          <TabsContent value="overdue" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {overdueOrders
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((order, index) => (
                  <div
                    key={order.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <RepairOrderCard order={order} workers={workers} />
                  </div>
                ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
