import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { MetricsOverview, type DateFilter } from '../components/MetricsOverview';
import { useAuthStore } from '../store/useAuthStore';
import { useViewStore } from '../store/useViewStore';
import { useUsers } from '../hooks/useUsers';

// Feature exports
import { useTasks } from '../features/tasks/hooks/useTasks';
import { TaskFilters } from '../features/tasks/components/TaskFilters';
import { TaskList } from '../features/tasks/components/TaskList';
import type { Task } from '../features/tasks/services/tasks.api';

const completedLabels: Record<DateFilter, string> = {
  today: 'Completed Today',
  week: 'Completed This Week',
  month: 'Completed This Month',
  all: 'Completed (Total)',
};

// Open tasks are always shown; completed tasks are filtered by when they were completed
const matchesDateFilter = (task: Task, dateFilter: DateFilter, now: Date) => {
  if (dateFilter === 'all' || task.status === 'pending') return true;

  const taskDate = new Date(task.completed_at ?? task.created_at);
  if (dateFilter === 'today') return taskDate.toDateString() === now.toDateString();
  if (dateFilter === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return taskDate >= weekAgo;
  }
  return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
};

export default function TasksPage() {
  const { currentUser, currentUserName, session } = useAuthStore();

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'company'>('my_tasks');

  // Dynamic Multi-User Views logic (keeps global view config here or in store)
  const { viewedUsers, sortConfig, addViewedUser, removeViewedUser, setSortForUser } = useViewStore();
  const { users, isLoading: usersLoading, getDisplayName } = useUsers(!!session);

  useEffect(() => {
    if (currentUser && !viewedUsers.includes(currentUser)) {
      addViewedUser(currentUser);
    }
  }, [currentUser, viewedUsers, addViewedUser]);

  // Use the new Feature Hook to get data & mutation handlers
  const {
    tasks,
    isLoading: tasksLoading,
    error,
    clearError,
    toggleTask,
    updateTask,
    deleteTask,
    createTask
  } = useTasks(session, currentUser);

  const now = new Date();
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'my_tasks' && task.assignee !== currentUser) return false;
    return matchesDateFilter(task, dateFilter, now);
  });
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const totalTasks = filteredTasks.length;

  return (
    <DashboardLayout
      completed={completedCount}
      total={totalTasks}
      completedLabel={completedLabels[dateFilter]}
      currentUserName={currentUserName}
      onLogout={() => useAuthStore.getState().logout()}
    >
      {error && (
        <div className="flex items-center justify-between gap-4 p-3 text-sm text-priority-high bg-priority-high/10 border border-priority-high/20 rounded">
          <span>{error}</span>
          <button onClick={clearError} className="hover:opacity-70 cursor-pointer" title="Close">
            <X size={14} />
          </button>
        </div>
      )}

      <TaskFilters
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        usersLoading={usersLoading}
        viewedUsers={viewedUsers}
        addViewedUser={addViewedUser}
        currentUser={currentUser}
      />

      <MetricsOverview
        tasks={filteredTasks}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      <TaskList
        tasksLoading={tasksLoading}
        currentUser={currentUser}
        users={users}
        getDisplayName={getDisplayName}
        viewedUsers={viewedUsers}
        activeTab={activeTab}
        sortConfig={sortConfig}
        setSortForUser={setSortForUser}
        removeViewedUser={removeViewedUser}
        filteredTasks={filteredTasks}
        handleToggleTask={toggleTask}
        handleUpdateTask={updateTask}
        handleDeleteTask={deleteTask}
        handleCreateRealTask={createTask}
      />
    </DashboardLayout>
  );
}
