import { UserSelector } from '../../../components/UserSelector';
import { Button } from '../../../components/ui/Button';
import { Plus } from 'lucide-react';
import type { AppUser } from '../../../services/users.api';

interface TaskFiltersProps {
  activeTab: 'my_tasks' | 'company';
  setActiveTab: (tab: 'my_tasks' | 'company') => void;
  users: AppUser[];
  usersLoading: boolean;
  viewedUsers: string[];
  addViewedUser: (email: string) => void;
  currentUser: string;
}

export const TaskFilters = ({
  activeTab,
  setActiveTab,
  users,
  usersLoading,
  viewedUsers,
  addViewedUser,
  currentUser
}: TaskFiltersProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab('my_tasks')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'my_tasks' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'company' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          Company View
        </button>
      </div>

      <div className="flex w-full items-center justify-between mb-2 px-2 mt-4">
        <h2 className="text-xl font-semibold text-text-primary">Tasks</h2>

        <div className="flex items-center gap-3">
          {activeTab === 'company' && (
            <UserSelector
              users={users}
              loading={usersLoading}
              viewedUsers={viewedUsers}
              onAddUser={addViewedUser}
            />
          )}

          <Button
            variant="primary"
            className="text-sm py-1.5 h-8 px-4 whitespace-nowrap"
            onClick={() => {
              const event = new CustomEvent('open-inline-creator', { detail: { assignee: currentUser } });
              window.dispatchEvent(event);

              setTimeout(() => {
                const input = document.getElementById(`inline-creator-${currentUser}`);
                if (input) {
                  input.focus();
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 50);
            }}
          >
            <div className="flex items-center gap-1">
              <Plus size={16} /> New Task
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};
