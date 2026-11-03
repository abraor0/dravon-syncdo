import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortType = 'date_desc' | 'date_asc' | 'priority' | 'status';

export interface ViewState {
  viewedUsers: string[];
  sortConfig: Record<string, SortType>;
  addViewedUser: (email: string) => void;
  removeViewedUser: (email: string) => void;
  setSortForUser: (email: string, sortType: SortType) => void;
  clearView: () => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      // Array of emails to display as columns (empty by default means it will be populated dynamically or via user selection)
      viewedUsers: [],

      // Object mapping an email to a sort config string (e.g. { 'example@example.com': 'date_desc' })
      sortConfig: {},

      addViewedUser: (email) => set((state) => ({
        viewedUsers: state.viewedUsers.includes(email)
          ? state.viewedUsers
          : [...state.viewedUsers, email]
      })),

      removeViewedUser: (email) => set((state) => ({
        viewedUsers: state.viewedUsers.filter((e) => e !== email)
      })),

      setSortForUser: (email, sortType) => set((state) => ({
        sortConfig: {
          ...state.sortConfig,
          [email]: sortType
        }
      })),

      // Resets memory if needed
      clearView: () => set({ viewedUsers: [], sortConfig: {} })
    }),
    {
      name: 'syncdo-view-storage', // name of the item in the storage (must be unique)
      // v1: columns are keyed by email instead of display name; older saved views are discarded
      version: 1,
      migrate: () => ({ viewedUsers: [], sortConfig: {} }) as unknown as ViewState,
    }
  )
);
