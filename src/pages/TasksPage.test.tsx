import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aCompletedTask, aSession, aTask, USER_A, USER_B } from '../test/builders';
import { useAuthStore } from '../store/useAuthStore';
import { useViewStore } from '../store/useViewStore';
import { useTasks } from '../features/tasks/hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import type { Task } from '../features/tasks/services/tasks.api';
import TasksPage from './TasksPage';

vi.mock('../supabaseClient', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('../features/tasks/hooks/useTasks', () => ({ useTasks: vi.fn() }));
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }));

// The page is tested with its data hooks replaced; the hooks have their own tests.
const tasksHook = vi.mocked(useTasks);
const usersHook = vi.mocked(useUsers);
const nameOf = (email: string) => [USER_A, USER_B].find(u => u.email === email)?.name ?? email;

// Wednesday 17 June 2026, 12:00 local time
const NOW = new Date(2026, 5, 17, 12, 0, 0);
const at = (month: number, day: number, hour = 9) => new Date(2026, month, day, hour).toISOString();

function givenTasks(tasks: Task[], extra: Partial<ReturnType<typeof useTasks>> = {}) {
  const hook = {
    tasks,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    toggleTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createTask: vi.fn(),
    ...extra,
  };
  tasksHook.mockReturnValue(hook);
  return hook;
}

const header = () => screen.getByRole('banner');
// "Completed Today" followed by e.g. "2 / 5"
const headerCount = () => within(header()).getByText(/^Completed/).nextElementSibling?.textContent;
const visibleTitles = () => screen.queryAllByRole('heading', { level: 3 })
  .map(h => h.textContent ?? '')
  .filter(t => t.startsWith('Example') && !t.startsWith('Example User')); // card titles, not column titles

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  useAuthStore.setState({
    session: aSession(), currentUser: USER_A.email, currentUserName: USER_A.name, loading: false, logout: vi.fn(),
  });
  useViewStore.setState({ viewedUsers: [], sortConfig: {} });
  usersHook.mockReturnValue({ users: [USER_A, USER_B], isLoading: false, getDisplayName: nameOf });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TasksPage', () => {
  it('shows the signed-in member and adds their own column automatically', () => {
    givenTasks([]);
    render(<TasksPage />);

    expect(within(header()).getByText('Example User 1')).toBeInTheDocument();
    expect(useViewStore.getState().viewedUsers).toEqual([USER_A.email]);
    expect(tasksHook).toHaveBeenCalledWith(useAuthStore.getState().session, USER_A.email);
  });

  it('My Tasks counts and lists only your tasks', () => {
    givenTasks([
      aTask({ title: 'Example mine open' }),
      aCompletedTask(at(5, 17), { title: 'Example mine done today' }),
      aTask({ title: 'Example theirs', assignee: USER_B.email }),
    ]);
    render(<TasksPage />);

    expect(visibleTitles().sort()).toEqual(['Example mine done today', 'Example mine open']);
    expect(headerCount()).toBe('1 / 2');
  });

  describe('date filters', () => {
    const tasks = [
      aTask({ title: 'Example open since last year', created_at: new Date(2025, 0, 10).toISOString() }),
      aCompletedTask(at(5, 17), { title: 'Example done today' }),
      aCompletedTask(at(5, 14), { title: 'Example done 3 days ago' }),
      aCompletedTask(at(5, 3), { title: 'Example done earlier this month' }),
      aCompletedTask(at(4, 28), { title: 'Example done last month' }),
    ];

    async function choose(period: string) {
      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: period }));
    }

    it('Today (the default) shows open tasks and those completed today', () => {
      givenTasks(tasks);
      render(<TasksPage />);

      expect(within(header()).getByText('Completed Today')).toBeInTheDocument();
      expect(visibleTitles().sort()).toEqual(['Example done today', 'Example open since last year']);
      expect(headerCount()).toBe('1 / 2');
    });

    it('Week covers the last 7 days', async () => {
      givenTasks(tasks);
      render(<TasksPage />);
      await choose('Week');

      expect(within(header()).getByText('Completed This Week')).toBeInTheDocument();
      expect(visibleTitles()).toContain('Example done 3 days ago');
      expect(visibleTitles()).not.toContain('Example done earlier this month');
      expect(headerCount()).toBe('2 / 3');
    });

    it('Month covers the current calendar month', async () => {
      givenTasks(tasks);
      render(<TasksPage />);
      await choose('Month');

      expect(within(header()).getByText('Completed This Month')).toBeInTheDocument();
      expect(visibleTitles()).toContain('Example done earlier this month');
      expect(visibleTitles()).not.toContain('Example done last month');
      expect(headerCount()).toBe('3 / 4');
    });

    it('All shows everything', async () => {
      givenTasks(tasks);
      render(<TasksPage />);
      await choose('All');

      expect(within(header()).getByText('Completed (Total)')).toBeInTheDocument();
      expect(visibleTitles()).toHaveLength(5);
      expect(headerCount()).toBe('4 / 5');
    });

    it('a completed task without completed_at is dated by created_at', () => {
      givenTasks([aTask({ title: 'Example legacy done', status: 'completed', completed_at: null, created_at: at(5, 17, 8) })]);
      render(<TasksPage />);

      expect(visibleTitles()).toEqual(['Example legacy done']);
    });
  });

  it('Company View shows the columns chosen for teammates', async () => {
    useViewStore.setState({ viewedUsers: [USER_A.email, USER_B.email] });
    givenTasks([aTask({ title: 'Example theirs', assignee: USER_B.email })]);
    render(<TasksPage />);
    expect(screen.queryByRole('heading', { name: 'Example User 2' })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Company View' }));

    expect(screen.getByRole('heading', { name: 'Example User 2' })).toBeInTheDocument();
    expect(visibleTitles()).toEqual(['Example theirs']);
  });

  it('shows an error banner that can be dismissed', async () => {
    const hook = givenTasks([], { error: 'Could not save the task: boom' });
    render(<TasksPage />);

    expect(screen.getByText('Could not save the task: boom')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTitle('Close'));

    expect(hook.clearError).toHaveBeenCalled();
  });

  it('signs out from the header', async () => {
    givenTasks([]);
    render(<TasksPage />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    expect(useAuthStore.getState().logout).toHaveBeenCalled();
  });
});
