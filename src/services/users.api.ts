import { supabase } from '../supabaseClient';

export interface AppUser {
  email: string;
  name: string;
}

export const displayNameFor = (email: string, name?: string | null) =>
  name || email.split('@')[0];

export const usersApi = {
  fetchUsers: async (): Promise<AppUser[]> => {
    const { data, error } = await supabase.rpc('get_all_users');

    if (error) throw error;
    return (data || []).map(u => ({ email: u.email, name: displayNameFor(u.email, u.name) }));
  }
};
