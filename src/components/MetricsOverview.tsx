import { Calendar, LayoutDashboard } from 'lucide-react';
import type { Task } from '../features/tasks/services/tasks.api';

export type DateFilter = 'today' | 'week' | 'month' | 'all';

const dateFilters: { id: DateFilter, label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All' }
];

export const MetricsOverview = ({ tasks, dateFilter, setDateFilter }: { tasks: Task[], dateFilter: DateFilter, setDateFilter: (f: DateFilter) => void }) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;

  const highPriority = tasks.filter(t => t.priority === 'high' && t.status === 'pending').length;

  const conversionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="bg-bg-card border border-border rounded-lg p-5 w-full flex flex-col lg:flex-row items-center justify-between gap-6 shadow-sm">

      {/* Left: Summary */}
      <div className="flex flex-col gap-1 w-full lg:w-auto">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <LayoutDashboard size={18} className="text-brand" />
          Overview
        </h2>
        <p className="text-xs text-text-secondary">
          Pipeline statistics
        </p>
      </div>

      {/* Middle: Inline Metrics */}
      <div className="flex flex-wrap gap-x-8 gap-y-4 items-center flex-1 justify-center lg:justify-start lg:pl-8 lg:border-l lg:border-border">

        <div className="flex flex-col items-center lg:items-start">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">Open</p>
          <p className="text-2xl font-bold text-text-primary leading-none">{total - completed}</p>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">Completed</p>
          <p className="text-2xl font-bold text-brand leading-none">{completed}</p>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">High Priority</p>
          <p className="text-2xl font-bold text-priority-high leading-none">{highPriority}</p>
        </div>

        <div className="flex-col items-center lg:items-start hidden sm:flex">
          <p className="text-[10px] text-text-secondary uppercase tracking-widest font-mono mb-1">Conversion</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-16 h-1.5 bg-bg-main rounded-full overflow-hidden border border-border/50">
              <div className="h-full bg-brand transition-all duration-500" style={{ width: `${conversionRate}%` }}></div>
            </div>
            <span className="text-xs font-bold text-text-primary">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* Right: Filter */}
      <div className="flex items-center gap-4 w-full lg:w-auto mt-2 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border overflow-x-auto">
        <Calendar size={14} className="text-text-secondary ml-1 hidden sm:block" />
        <div className="flex gap-4 items-center">
          {dateFilters.map((f) => {
            const isActive = dateFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`text-xs font-medium pb-0.5 border-b transition-colors whitespace-nowrap cursor-pointer ${isActive
                    ? 'text-text-primary border-text-primary'
                    : 'text-text-secondary border-transparent hover:text-text-primary'
                  }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
