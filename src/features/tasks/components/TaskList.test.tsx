import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aTask, USER_A, USER_B } from '../../../test/builders';
import type { SortType } from '../../../store/useViewStore';
import { TaskList } from './TaskList';

type Props = Parameters<typeof TaskList>[0];
const nameOf = (email: string) => [USER_A, USER_B].find(u => u.email === email)?.name ?? email;

function renderList(overrides: Partial<Props> = {}) {
  const props: Props = {
    tasksLoading: false,
    currentUser: USER_A.email,
    users: [USER_A, USER_B],
    getDisplayName: nameOf,
    viewedUsers: [USER_A.email],
    activeTab: 'my_tasks',
    sortConfig: {},
    setSortForUser: vi.fn(),
    removeViewedUser: vi.fn(),
    filteredTasks: [],
    handleToggleTask: vi.fn(),
    handleUpdateTask: vi.fn(),
    handleDeleteTask: vi.fn(),
    handleCreateRealTask: vi.fn(),
    ...overrides,
  };
  render(<TaskList {...props} />);
  return props;
}

// Card titles are level-3 headings, like the column titles; skip the column ones.
const cardTitles = (container: HTMLElement = document.body) =>
  within(container).getAllByRole('heading', { level: 3 })
    .map(h => h.textContent ?? '')
    .filter(t => !['Your Tasks', 'Example User 1', 'Example User 2'].includes(t));

// The column element that holds a given column title.
const column = (title: string) => screen.getByRole('heading', { name: title }).closest('div.relative') as HTMLElement;

describe('TaskList', () => {
  it('shows a loading state while tasks are syncing', () => {
    renderList({ tasksLoading: true });
    expect(screen.getByText('Syncing tasks...')).toBeInTheDocument();
    expect(screen.queryByText('Your Tasks')).not.toBeInTheDocument();
  });

  it('My Tasks shows a single "Your Tasks" column with only your tasks', () => {
    renderList({
      activeTab: 'my_tasks',
      viewedUsers: [USER_A.email, USER_B.email],
      filteredTasks: [aTask({ title: 'Mine', assignee: USER_A.email }), aTask({ title: 'Theirs', assignee: USER_B.email })],
    });

    expect(screen.getByRole('heading', { name: 'Your Tasks' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example User 2' })).not.toBeInTheDocument();
    expect(cardTitles()).toEqual(['Mine']);
  });

  it('Company View shows one column per chosen member, named after them', () => {
    renderList({
      activeTab: 'company',
      viewedUsers: [USER_A.email, USER_B.email],
      filteredTasks: [aTask({ title: 'Mine', assignee: USER_A.email }), aTask({ title: 'Theirs', assignee: USER_B.email })],
    });

    expect(cardTitles(column('Your Tasks'))).toEqual(['Mine']);
    expect(cardTitles(column('Example User 2'))).toEqual(['Theirs']);
  });

  it('says so when a column has no tasks', () => {
    renderList({ filteredTasks: [] });
    expect(screen.getByText('No tasks found.')).toBeInTheDocument();
  });

  it('only your own column has the inline creator', () => {
    renderList({ activeTab: 'company', viewedUsers: [USER_A.email, USER_B.email] });

    expect(within(column('Your Tasks')).getByRole('button', { name: 'Add a card' })).toBeInTheDocument();
    expect(within(column('Example User 2')).queryByRole('button', { name: 'Add a card' })).not.toBeInTheDocument();
  });

  it('teammates\' columns can be removed in Company View; yours cannot', async () => {
    const user = userEvent.setup();
    const props = renderList({ activeTab: 'company', viewedUsers: [USER_A.email, USER_B.email] });

    // The button's visible text is "✕"; its title says what it does
    expect(within(column('Your Tasks')).queryByTitle('Remove column')).not.toBeInTheDocument();
    await user.click(within(column('Example User 2')).getByTitle('Remove column'));

    expect(props.removeViewedUser).toHaveBeenCalledWith(USER_B.email);
  });

  it('changing a column\'s sort saves it for that member', async () => {
    const user = userEvent.setup();
    const props = renderList();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'priority');

    expect(props.setSortForUser).toHaveBeenCalledWith(USER_A.email, 'priority');
  });

  describe('sorting', () => {
    const tasks = [
      aTask({ title: 'Old, low, done', priority: 'low', status: 'completed', created_at: '2026-06-01T08:00:00Z', completed_at: '2026-06-02T08:00:00Z', completed_by: USER_A.email }),
      aTask({ title: 'Newest, medium', priority: 'medium', created_at: '2026-06-03T08:00:00Z' }),
      aTask({ title: 'Middle, high', priority: 'high', created_at: '2026-06-02T08:00:00Z' }),
    ];
    const orderWith = (sort: SortType | undefined) => {
      renderList({ filteredTasks: [...tasks], sortConfig: sort ? { [USER_A.email]: sort } : {} });
      return cardTitles();
    };

    it('defaults to newest first', () => {
      expect(orderWith(undefined)).toEqual(['Newest, medium', 'Middle, high', 'Old, low, done']);
      expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('date_desc');
    });

    it('oldest first', () => {
      expect(orderWith('date_asc')).toEqual(['Old, low, done', 'Middle, high', 'Newest, medium']);
    });

    it('by priority, highest first', () => {
      expect(orderWith('priority')).toEqual(['Middle, high', 'Newest, medium', 'Old, low, done']);
    });

    it('by status, alphabetically (completed before pending)', () => {
      expect(orderWith('status')[0]).toBe('Old, low, done');
    });
  });

  it('wires each card: toggling passes the task\'s current status', async () => {
    const user = userEvent.setup();
    const task = aTask({ title: 'Toggle me', status: 'pending' });
    const props = renderList({ filteredTasks: [task] });

    await user.click(screen.getByRole('checkbox'));

    expect(props.handleToggleTask).toHaveBeenCalledWith(task.id, 'pending');
  });
});
