import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from './ui/Button';
import { Loader2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login | Dravon";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border w-full max-w-sm rounded-lg shadow-2xl p-8 relative">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="w-10 h-10 bg-brand flex rounded-[6px] items-center justify-center shadow-[0_0_15px_var(--color-brand-muted)]">
              {/* Fake logo mark */}
              <span className="w-3 h-5 bg-bg-main skew-x-12"></span>
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Dravon SyncDo</h1>
          <p className="text-sm text-text-secondary font-mono mt-1">Restricted Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 mb-6 text-sm text-priority-high bg-priority-high/10 border border-priority-high/20 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1">Email or Username</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-main border border-border rounded p-2.5 text-text-primary focus:outline-none focus:border-brand"
              placeholder="example@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-main border border-border rounded p-2.5 text-text-primary focus:outline-none focus:border-brand"
              placeholder="enter your password"
              required
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </span>
              ) : 'Login'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-text-secondary">
          <p>Public sign-up is disabled for security reasons.</p>
          <p>Ask an administrator for access.</p>
        </div>
      </div>
    </div>
  );
};
