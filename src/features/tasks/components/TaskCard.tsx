import { useState, useRef, useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { TaskCheckbox } from '../../../components/ui/TaskCheckbox';
import { MoreVertical, Trash2 } from 'lucide-react';
import type { Task, TaskUpdate } from '../services/tasks.api';
import type { AppUser } from '../../../services/users.api';

interface TaskCardProps {
  task: Task;
  currentUser: string;
  users: AppUser[];
  getDisplayName: (email: string) => string;
  onToggle: (id: number) => void;
  onUpdate: (id: number, updates: TaskUpdate) => void;
  onDelete: (id: number) => void;
}

export const TaskCard = ({ task, currentUser, users, getDisplayName, onToggle, onUpdate, onDelete }: TaskCardProps) => {
  const isOwner = task.assignee === currentUser;
  const isCompleted = task.status === 'completed';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description || '');

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start editing from the latest server value, which realtime may have changed
  const startEditingTitle = () => {
    setTitleValue(task.title);
    setIsEditingTitle(true);
  };

  const startEditingDesc = () => {
    setDescValue(task.description || '');
    setIsEditingDesc(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      onUpdate(task.id, { title: titleValue.trim() });
    }
  };

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    const trimmed = descValue.trim();
    if (trimmed !== (task.description || '')) {
      onUpdate(task.id, { description: trimmed || null });
    }
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { priority: e.target.value });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate(task.id, { assignee: e.target.value });
  };

  // Guarantee the current assignee is an option even if they are missing from the user list
  const assigneeOptions = users.some(u => u.email === task.assignee)
    ? users
    : [{ email: task.assignee, name: getDisplayName(task.assignee) }, ...users];

  return (
    <div
      className={`
        bg-bg-card border border-border rounded-md p-4 transition-all duration-200
        hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lg
        flex items-start gap-4 group relative
        ${isCompleted ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className={`pt-1 ${!isOwner ? 'pointer-events-none opacity-60' : ''}`}>
        <TaskCheckbox
          checked={isCompleted}
          onChange={() => isOwner && onToggle(task.id)}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 max-w-full">
            {isEditingTitle ? (
              <input
                autoFocus
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full bg-bg-main border border-brand/50 rounded px-2 py-1 text-sm font-medium text-text-primary focus:outline-none focus:border-brand"
              />
            ) : (
              <h3
                className={`font-medium rounded px-1 -mx-1
                  ${isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'}
                  ${isOwner ? 'cursor-pointer hover:bg-bg-main/50' : 'cursor-default'}
                `}
                onClick={() => isOwner && startEditingTitle()}
              >
                {task.title}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Native select stretched invisibly over the badge so clicking the badge opens it */}
            <div className={`relative ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}>
              <Badge priority={task.priority} />
              {isOwner && (
                <select
                  value={task.priority}
                  onChange={handlePriorityChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Change priority"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              )}
            </div>

            {/* Three-dot menu */}
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-main transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-bg-card border border-border rounded shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { setShowMenu(false); onDelete(task.id); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-priority-high hover:bg-priority-high/10 transition-colors text-left"
                    >
                      <Trash2 size={12} /> Delete Task
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          {isEditingDesc ? (
            <textarea
              autoFocus
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onBlur={handleDescBlur}
              className="w-full bg-bg-main border border-brand/50 rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-brand resize-none min-h-[60px]"
              placeholder="Describe the details..."
            />
          ) : (
            <p
              className={`text-sm text-text-secondary line-clamp-2 rounded px-1 -mx-1 min-h-[20px]
                ${isOwner ? 'cursor-pointer hover:bg-bg-main/50' : 'cursor-default'}
              `}
              onClick={() => isOwner && startEditingDesc()}
            >
              {task.description || <span className="italic opacity-50">{isOwner ? '+ Add description' : 'No description'}</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <select
            value={task.assignee}
            onChange={handleAssigneeChange}
            disabled={!isOwner}
            title={isOwner ? 'Reassign task' : undefined}
            className={`bg-transparent text-xs text-text-secondary font-mono border-b border-dashed border-border/50 focus:outline-none transition-colors appearance-none pb-0.5
              ${isOwner ? 'cursor-pointer hover:text-text-primary hover:border-text-primary' : 'cursor-default'}
            `}
          >
            {assigneeOptions.map(u => (
              <option key={u.email} value={u.email} className="bg-bg-card text-text-primary">{u.name}</option>
            ))}
          </select>
          {isCompleted && task.completed_by && (
            <span className="text-[10px] text-text-secondary/70 font-mono">
              ✓ {getDisplayName(task.completed_by)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
