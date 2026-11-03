import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { displayNameFor } from '../services/users.api';

interface AuthState {
  session: Session | null;
  // Email of the signed-in user; this is the identity stored in tasks.assignee
  currentUser: string;
  // Human-readable name for display only
  currentUserName: string;
  loading: boolean;
  initialize: () => () => void;
  logout: () => Promise<void>;
}

const stateFromSession = (session: Session | null) => {
  if (!session) {
    return { session: null, currentUser: '', currentUserName: '', loading: false };
  }
  const email = session.user.email ?? '';
  const metadataName = session.user.user_metadata?.name || session.user.user_metadata?.full_name;
  return { session, currentUser: email, currentUserName: displayNameFor(email, metadataName), loading: false };
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  currentUser: '',
  currentUserName: '',
  loading: true,
  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set(stateFromSession(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set(stateFromSession(session));
    });

    return () => subscription.unsubscribe();
  },
  logout: async () => {
    await supabase.auth.signOut();
  }
}));
