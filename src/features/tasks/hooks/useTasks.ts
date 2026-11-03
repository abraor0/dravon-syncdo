import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { tasksApi, type Task, type TaskUpdate, type TaskInsert } from '../services/tasks.api';
import type { RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js';

const errorMessage = (fallback: string, error: unknown) =>
  error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback;

export function useTasks(session: Session | null, currentUser: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.fetchTasks,
    enabled: !!session,
  });

  const upsertTask = useCallback((task: Task) => {
    queryClient.setQueryData<Task[]>(['tasks'], (oldTasks = []) =>
      oldTasks.some(t => t.id === task.id)
        ? oldTasks.map(t => t.id === task.id ? task : t)
        : [task, ...oldTasks]
    );
  }, [queryClient]);

  // Set up Realtime Subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: RealtimePostgresChangesPayload<Task>) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          upsertTask(payload.new);
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          queryClient.setQueryData<Task[]>(['tasks'], (oldTasks = []) =>
            oldTasks.filter(t => t.id !== deletedId)
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, queryClient, upsertTask]);

  // Mutations
  const updateTask = async (id: number, updates: TaskUpdate) => {
    // Optimistic update
    queryClient.setQueryData<Task[]>(['tasks'], (oldTasks = []) =>
      oldTasks.map(t => t.id === id ? { ...t, ...updates } : t)
    );

    try {
      upsertTask(await tasksApi.updateTask(id, updates));
    } catch (err) {
      console.error('Error updating task:', err);
      setError(errorMessage('Could not save the task', err));
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  const toggleTask = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const completionData = newStatus === 'completed'
      ? { completed_at: new Date().toISOString(), completed_by: currentUser }
      : { completed_at: null, completed_by: null };

    await updateTask(id, { status: newStatus, ...completionData });
  };

  const deleteTask = async (id: number) => {
    queryClient.setQueryData<Task[]>(['tasks'], (oldTasks = []) =>
      oldTasks.filter(t => t.id !== id)
    );

    try {
      await tasksApi.deleteTask(id);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(errorMessage('Could not delete the task', err));
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  const createTask = async (taskData: TaskInsert) => {
    try {
      // Realtime will deliver the same row; upsert keeps it from being duplicated
      upsertTask(await tasksApi.createTask(taskData));
    } catch (err) {
      console.error('Error creating task:', err);
      setError(errorMessage('Could not create the task', err));
    }
  };

  return {
    tasks,
    isLoading,
    error,
    clearError: () => setError(null),
    toggleTask,
    updateTask,
    deleteTask,
    createTask
  };
}
