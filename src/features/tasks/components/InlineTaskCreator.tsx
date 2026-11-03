import { useState, useRef, useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Plus, X, ChevronDown } from 'lucide-react';
import type { TaskInsert } from '../services/tasks.api';

interface InlineTaskCreatorProps {
  assignee: string;
  onSubmit: (taskData: TaskInsert) => void;
  inputId: string;
}

export const InlineTaskCreator = ({ assignee, onSubmit, inputId }: InlineTaskCreatorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Global listener to open this specific user's creator when triggered from the main button
  useEffect(() => {
    const handleGlobalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.assignee === assignee) {
        setIsEditing(true);
      }
    };
    window.addEventListener('open-inline-creator', handleGlobalTrigger);
    return () => window.removeEventListener('open-inline-creator', handleGlobalTrigger);
  }, [assignee]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      assignee,
      priority,
      status: 'pending'
    });

    setTitle('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTitle('');
      setIsDropdownOpen(false);
    }
  };

  const handlePrioritySelect = (newPriority: string) => {
    setPriority(newPriority);
    setIsDropdownOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card rounded-md transition-colors hover:cursor-pointer"
      >
        <Plus size={16} /> Add a card
      </button>
    );
  }

  return (
    <div className="bg-bg-main border border-border rounded-md p-3 flex flex-col gap-2 mt-2 shadow-sm focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/20">
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title for this card..."
        className="w-full bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-secondary/50"
        autoComplete="off"
      />

      <div className="flex items-center justify-between mt-1">

        {/* Custom Dropdown relative container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <Badge priority={priority} />
            <ChevronDown size={14} className="text-text-secondary" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-32 bg-bg-card border border-border rounded-md shadow-lg z-50 flex flex-col py-1 overflow-hidden">
              <button
                type="button"
                className={`text-left px-3 py-1.5 focus:outline-none focus:bg-bg-main hover:bg-bg-main transition-colors flex items-center ${priority === 'high' ? 'bg-bg-main' : ''}`}
                onClick={() => handlePrioritySelect('high')}
              >
                <Badge priority="high" />
              </button>
              <button
                type="button"
                className={`text-left px-3 py-1.5 focus:outline-none focus:bg-bg-main hover:bg-bg-main transition-colors flex items-center ${priority === 'medium' ? 'bg-bg-main' : ''}`}
                onClick={() => handlePrioritySelect('medium')}
              >
                <Badge priority="medium" />
              </button>
              <button
                type="button"
                className={`text-left px-3 py-1.5 focus:outline-none focus:bg-bg-main hover:bg-bg-main transition-colors flex items-center ${priority === 'low' ? 'bg-bg-main' : ''}`}
                onClick={() => handlePrioritySelect('low')}
              >
                <Badge priority="low" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {title.trim().length > 0 && (
            <span className="text-[10px] text-text-secondary/50 font-mono hidden sm:inline-block">
              Enter ⏎
            </span>
          )}
          <button
            onClick={() => {
              setIsEditing(false);
              setTitle('');
              setIsDropdownOpen(false);
            }}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-main"
            title="Cancel (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
