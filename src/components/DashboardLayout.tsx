import { LogOut } from 'lucide-react';

export const DashboardLayout = ({ children, completed = 0, total = 0, completedLabel, currentUserName, onLogout }: { children: React.ReactNode, completed?: number, total?: number, completedLabel: string, currentUserName: string, onLogout: () => void }) => {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary flex flex-col items-center">
      {/* Header Premium Dravon */}
      <header className="w-full max-w-6xl mx-auto px-6 py-8 border-b border-border mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <span className="w-6 h-6 bg-brand flex rounded-[4px] items-center justify-center">
              {/* Fake logo mark */}
              <span className="w-2 h-4 bg-bg-main skew-x-12"></span>
            </span>
            Dravon SyncDo
          </h1>
          <p className="text-sm text-text-secondary font-mono mt-1">Task Architecture</p>
        </div>

        <div className="flex items-center gap-8">
          {/* Active Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-text-secondary font-mono uppercase tracking-widest whitespace-nowrap">Active Session</span>
              <span className="text-sm font-medium text-text-primary">{currentUserName}</span>
            </div>
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center rounded bg-bg-card border border-border text-text-secondary hover:text-priority-high hover:border-priority-high/50 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Stats */}
          <div className="text-right border-l border-border pl-6">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-mono">{completedLabel}</p>
            <p className="text-xl font-semibold text-brand">{completed} <span className="text-text-secondary text-sm">/ {total}</span></p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-6 flex-1 flex flex-col gap-8 pb-12">
        {children}
      </main>
    </div>
  );
};
