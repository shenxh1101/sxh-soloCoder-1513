import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Worker, RepairOrder, Facility, Statistics } from '../../shared/types';

interface AppState {
  currentUser: Worker | null;
  repairOrders: RepairOrder[];
  facilities: Facility[];
  workers: Worker[];
  statistics: Statistics | null;
  loading: boolean;
  error: string | null;
  
  setCurrentUser: (user: Worker | null) => void;
  logout: () => void;
  
  setRepairOrders: (orders: RepairOrder[]) => void;
  addRepairOrder: (order: RepairOrder) => void;
  updateRepairOrder: (order: RepairOrder) => void;
  
  setFacilities: (facilities: Facility[]) => void;
  addFacility: (facility: Facility) => void;
  updateFacility: (facility: Facility) => void;
  removeFacility: (id: string) => void;
  
  setWorkers: (workers: Worker[]) => void;
  
  setStatistics: (stats: Statistics) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      repairOrders: [],
      facilities: [],
      workers: [],
      statistics: null,
      loading: false,
      error: null,
      
      setCurrentUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      
      setRepairOrders: (orders) => set({ repairOrders: orders }),
      addRepairOrder: (order) => set((state) => ({
        repairOrders: [order, ...state.repairOrders],
      })),
      updateRepairOrder: (order) => set((state) => ({
        repairOrders: state.repairOrders.map((o) =>
          o.id === order.id ? order : o
        ),
      })),
      
      setFacilities: (facilities) => set({ facilities }),
      addFacility: (facility) => set((state) => ({
        facilities: [facility, ...state.facilities],
      })),
      updateFacility: (facility) => set((state) => ({
        facilities: state.facilities.map((f) =>
          f.id === facility.id ? facility : f
        ),
      })),
      removeFacility: (id) => set((state) => ({
        facilities: state.facilities.filter((f) => f.id !== id),
      })),
      
      setWorkers: (workers) => set({ workers }),
      
      setStatistics: (stats) => set({ statistics: stats }),
      
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'facility-repair-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
