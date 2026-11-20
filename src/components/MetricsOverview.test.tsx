import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aCompletedTask, aTask } from '../test/builders';
import type { Task } from '../features/tasks/services/tasks.api';
import { MetricsOverview, type DateFilter } from './MetricsOverview';

function renderMetrics(tasks: Task[], dateFilter: DateFilter = 'today') {
  const setDateFilter = vi.fn();
  render(<MetricsOverview tasks={tasks} dateFilter={dateFilter} setDateFilter={setDateFilter} />);
  return setDateFilter;
}

// Each metric is a caption followed by its value.
const metric = (caption: string) => screen.getByText(caption).nextElementSibling?.textContent;

describe('MetricsOverview', () => {
  it('counts open, completed and open high-priority tasks', () => {
    renderMetrics([
      aTask({ priority: 'high' }),
      aTask({ priority: 'high' }),
      aTask({ priority: 'low' }),
      aCompletedTask('2026-06-01T10:00:00Z', { priority: 'high' }),
    ]);

    expect(metric('Open')).toBe('3');
    expect(metric('Completed')).toBe('1');
    expect(metric('High Priority')).toBe('2'); // the completed high-priority task doesn't count
  });

  it('shows the share of completed tasks, rounded', () => {
    renderMetrics([aTask(), aTask(), aCompletedTask('2026-06-01T10:00:00Z')]);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('shows zeros and 0% when there are no tasks', () => {
    renderMetrics([]);

    expect(metric('Open')).toBe('0');
    expect(metric('Completed')).toBe('0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('offers the four periods and reports the one that is picked', async () => {
    const setDateFilter = renderMetrics([], 'today');
    const user = userEvent.setup();

    expect(['Today', 'Week', 'Month', 'All'].map(name => screen.getByRole('button', { name }))).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Week' }));
    await user.click(screen.getByRole('button', { name: 'All' }));

    expect(setDateFilter.mock.calls).toEqual([['week'], ['all']]);
  });

  it('highlights the period that is active', () => {
    renderMetrics([], 'month');

    expect(screen.getByRole('button', { name: 'Month' })).toHaveClass('text-text-primary');
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('text-text-secondary');
  });
});
