import { supabase } from '../../../supabaseClient';
import type { Database } from '../../../types/database.types';

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export const tasksApi = {
  fetchTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createTask: async (taskData: TaskInsert): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateTask: async (id: number, updates: TaskUpdate): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteTask: async (id: number): Promise<boolean> => {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw error;
    // RLS hides rows the user may not delete, so a blocked delete affects zero rows without erroring
    if (!data || data.length === 0) throw new Error('You do not have permission to delete this task.');
    return true;
  }
};
