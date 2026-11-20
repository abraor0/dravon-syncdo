import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { USER_A, USER_B } from '../../../test/builders';
import { TaskFilters } from './TaskFilters';

type Props = Parameters<typeof TaskFilters>[0];

function renderFilters(overrides: Partial<Props> = {}) {
  const props: Props = {
    activeTab: 'my_tasks',
    setActiveTab: vi.fn(),
    users: [USER_A, USER_B],
    usersLoading: false,
    viewedUsers: [USER_A.email],
    addViewedUser: vi.fn(),
    currentUser: USER_A.email,
    ...overrides,
  };
  render(<TaskFilters {...props} />);
  return props;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TaskFilters', () => {
  it('switches between My Tasks and Company View', async () => {
    const user = userEvent.setup();
    const props = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Company View' }));
    await user.click(screen.getByRole('button', { name: 'My Tasks' }));

    expect(props.setActiveTab).toHaveBeenNthCalledWith(1, 'company');
    expect(props.setActiveTab).toHaveBeenNthCalledWith(2, 'my_tasks');
  });

  it('offers the member picker only in Company View', () => {
    renderFilters({ activeTab: 'my_tasks' });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('the member picker lists members who are not shown yet and adds the chosen one', async () => {
    const user = userEvent.setup();
    const props = renderFilters({ activeTab: 'company', viewedUsers: [USER_A.email] });
    const picker = screen.getByRole('combobox');

    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['+ Add User', 'Example User 2']);

    await user.selectOptions(picker, USER_B.email);

    expect(props.addViewedUser).toHaveBeenCalledWith(USER_B.email);
    expect(picker).toHaveValue('');
  });

  it('the member picker is disabled while members load', () => {
    renderFilters({ activeTab: 'company', usersLoading: true });

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Loading...' })).toBeInTheDocument();
  });

  it('"New Task" opens your own column\'s creator and then focuses its input', () => {
    vi.useFakeTimers();
    renderFilters({ currentUser: USER_A.email });
    const requests: unknown[] = [];
    const listener = (e: Event) => requests.push((e as CustomEvent).detail);
    window.addEventListener('open-inline-creator', listener);
    const input = document.createElement('input');
    input.id = `inline-creator-${USER_A.email}`;
    document.body.append(input);
    const scroll = vi.spyOn(input, 'scrollIntoView');

    fireEvent.click(screen.getByRole('button', { name: 'New Task' }));
    expect(requests).toEqual([{ assignee: USER_A.email }]);
    expect(input).not.toHaveFocus();

    act(() => { vi.advanceTimersByTime(50); });

    expect(input).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    window.removeEventListener('open-inline-creator', listener);
    input.remove();
  });
});
