import type { AppUser } from '../services/users.api';

interface UserSelectorProps {
  users: AppUser[];
  loading: boolean;
  viewedUsers: string[];
  onAddUser: (email: string) => void;
}

export const UserSelector = ({ users, loading, viewedUsers, onAddUser }: UserSelectorProps) => {
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedEmail = e.target.value;
    if (selectedEmail === '') return;

    if (!viewedUsers.includes(selectedEmail)) {
      onAddUser(selectedEmail);
    }

    e.target.value = ''; // reset after select
  };

  return (
    <select
      onChange={handleSelect}
      disabled={loading}
      className={`bg-bg-card border border-border rounded py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:border-brand cursor-pointer appearance-none shadow-sm ${loading ? 'text-text-secondary/50' : 'text-text-secondary'}`}
    >
      <option value="">{loading ? 'Loading...' : '+ Add User'}</option>
      {users.filter(u => !viewedUsers.includes(u.email)).map(u => (
        <option key={u.email} value={u.email}>{u.name}</option>
      ))}
    </select>
  );
};
