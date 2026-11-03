import { Loader2, Inbox } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { InlineTaskCreator } from './InlineTaskCreator';
import type { Task, TaskUpdate, TaskInsert } from '../services/tasks.api';
import type { SortType } from '../../../store/useViewStore';
import type { AppUser } from '../../../services/users.api';

interface TaskListProps {
  tasksLoading: boolean;
  currentUser: string;
  users: AppUser[];
  getDisplayName: (email: string) => string;
  viewedUsers: string[];
  activeTab: 'my_tasks' | 'company';
  sortConfig: Record<string, SortType>;
  setSortForUser: (email: string, sortType: SortType) => void;
  removeViewedUser: (email: string) => void;
  filteredTasks: Task[];
  handleToggleTask: (id: number, status: string) => void;
  handleUpdateTask: (id: number, updates: TaskUpdate) => void;
  handleDeleteTask: (id: number) => void;
  handleCreateRealTask: (taskData: TaskInsert) => void;
}

export const TaskList = ({ 
  tasksLoading, 
  currentUser,
  users,
  getDisplayName,
  viewedUsers,
  activeTab, 
  sortConfig, 
  setSortForUser, 
  removeViewedUser, 
  filteredTasks,
  handleToggleTask,
  handleUpdateTask,
  handleDeleteTask,
  handleCreateRealTask
}: TaskListProps) => {
  return (
    <div className={`grid gap-8 w-full mt-2 pb-6 flex-1 items-start min-h-[500px] ${
      viewedUsers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
    }`}>
      {tasksLoading ? (
        <div className="w-full flex flex-col items-center justify-center py-12 text-text-secondary col-span-full">
          <Loader2 className="animate-spin mb-4 text-brand" size={32} />
          <p className="animate-pulse">Syncing tasks...</p>
        </div>
      ) : (
        <>
          {(activeTab === 'my_tasks' ? [currentUser] : viewedUsers).map((userColumn) => (
            <div key={userColumn} className="relative transition-all duration-300 flex flex-col min-w-0 w-full">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-bg-main pb-2 z-10 border-b-2 border-border group">
                <h3 className="text-lg font-semibold text-text-secondary inline-flex items-center gap-2">
                  {userColumn === currentUser && <div className="w-2 h-2 rounded-full bg-brand"></div>}
                  {userColumn === currentUser ? "Your Tasks" : getDisplayName(userColumn)}
                </h3>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={sortConfig[userColumn] || 'date_desc'}
                    onChange={(e) => setSortForUser(userColumn, e.target.value as SortType)}
                    className="bg-transparent text-text-secondary text-[10px] outline-none cursor-pointer hover:text-text-primary uppercase tracking-wider font-mono appearance-none"
                    title="Sort by"
                  >
                    <option className="bg-bg-card text-text-primary" value="date_desc">NEWEST ⌄</option>
                    <option className="bg-bg-card text-text-primary" value="date_asc">OLDEST ⌄</option>
                    <option className="bg-bg-card text-text-primary" value="priority">PRIORITY ⌄</option>
                    <option className="bg-bg-card text-text-primary" value="status">STATUS ⌄</option>
                  </select>

                  {userColumn !== currentUser && activeTab === 'company' && (
                    <button
                      onClick={() => removeViewedUser(userColumn)}
                      className="text-text-secondary opacity-0 group-hover:opacity-100 hover:text-priority-high transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {(() => {
                  const colTasks = filteredTasks.filter(t => t.assignee === userColumn);
                  const sortType = sortConfig[userColumn] || 'date_desc';
                  
                  colTasks.sort((a, b) => {
                    if (sortType === 'date_desc') {
                      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                    }
                    if (sortType === 'date_asc') {
                      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                    }
                    if (sortType === 'priority') {
                      const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
                      return (p[b.priority] || 0) - (p[a.priority] || 0);
                    }
                    // status
                    return a.status.localeCompare(b.status);
                  });

                  return colTasks.length > 0 ? (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        currentUser={currentUser}
                        users={users}
                        getDisplayName={getDisplayName}
                        onToggle={(id) => handleToggleTask(id, task.status)}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border rounded-md text-text-secondary">
                      <Inbox className="mb-2 opacity-30" size={24} />
                      <p>No tasks found.</p>
                    </div>
                  );
                })()}
                {userColumn === currentUser && (
                  <div className="pt-2">
                    <InlineTaskCreator
                      assignee={userColumn}
                      onSubmit={handleCreateRealTask}
                      inputId={`inline-creator-${userColumn}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
