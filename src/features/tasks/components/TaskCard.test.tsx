import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aCompletedTask, aTask, USER_A, USER_B } from '../../../test/builders';
import type { Task } from '../services/tasks.api';
import { TaskCard } from './TaskCard';

const users = [USER_A, USER_B];
const nameOf = (email: string) => users.find(u => u.email === email)?.name ?? email.split('@')[0];

function renderCard(task: Task, currentUser = USER_A.email) {
  const handlers = { onToggle: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };
  const user = userEvent.setup();
  render(<TaskCard task={task} currentUser={currentUser} users={users} getDisplayName={nameOf} {...handlers} />);
  return { ...handlers, user };
}

describe('TaskCard: content', () => {
  it('shows the title, description, priority and assignee', () => {
    renderCard(aTask({ title: 'Prepare demo', description: 'Slides and script', priority: 'high', assignee: USER_A.email }));

    expect(screen.getByRole('heading', { name: 'Prepare demo' })).toBeInTheDocument();
    expect(screen.getByText('Slides and script')).toBeInTheDocument();
    expect(screen.getByText('High', { selector: 'span' })).toBeInTheDocument(); // the badge, not the hidden <option>
    expect(screen.getByRole('combobox', { name: 'Reassign task' })).toHaveDisplayValue('Example User 1');
  });

  it('marks a completed task as checked and says who completed it', () => {
    renderCard(aCompletedTask('2026-06-01T10:00:00.000Z', { completed_by: USER_B.email, assignee: USER_A.email }));

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('✓ Example User 2')).toBeInTheDocument();
  });

  it('keeps the current assignee selectable even when they are not in the member list', () => {
    renderCard(aTask({ assignee: 'former.example@example.com' }), 'former.example@example.com');

    const assignee = screen.getByRole('combobox', { name: 'Reassign task' });
    expect(assignee).toHaveDisplayValue('former.example');
    expect(within(assignee).getAllByRole('option')).toHaveLength(3);
  });
});

describe('TaskCard: as the assignee', () => {
  it('the checkbox toggles the task', async () => {
    const task = aTask();
    const { user, onToggle } = renderCard(task);

    await user.click(screen.getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith(task.id);
  });

  it('clicking the title edits it; Enter saves the trimmed value', async () => {
    const task = aTask({ title: 'Old title' });
    const { user, onUpdate } = renderCard(task);

    await user.click(screen.getByRole('heading', { name: 'Old title' }));
    const input = screen.getByDisplayValue('Old title');
    await user.clear(input);
    await user.type(input, '  New title  {Enter}');

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(task.id, { title: 'New title' });
    expect(screen.queryByDisplayValue('New title')).not.toBeInTheDocument();
  });

  it('leaving the title field also saves it', async () => {
    const task = aTask({ title: 'Old title' });
    const { user, onUpdate } = renderCard(task);

    await user.click(screen.getByRole('heading', { name: 'Old title' }));
    await user.type(screen.getByDisplayValue('Old title'), ' v2');
    await user.click(document.body);

    expect(onUpdate).toHaveBeenCalledWith(task.id, { title: 'Old title v2' });
  });

  it('does not save a title that is unchanged or blank', async () => {
    const { user, onUpdate } = renderCard(aTask({ title: 'Same' }));

    await user.click(screen.getByRole('heading', { name: 'Same' }));
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('heading', { name: 'Same' }));
    await user.clear(screen.getByDisplayValue('Same'));
    await user.keyboard('{Enter}');

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Same' })).toBeInTheDocument();
  });

  it('adds a description when leaving the text area', async () => {
    const task = aTask({ description: null });
    const { user, onUpdate } = renderCard(task);

    await user.click(screen.getByText('+ Add description'));
    await user.type(screen.getByPlaceholderText('Describe the details...'), '  Steps to reproduce  ');
    await user.click(document.body);

    expect(onUpdate).toHaveBeenCalledWith(task.id, { description: 'Steps to reproduce' });
  });

  it('clearing the description stores null, and an unchanged one is not saved', async () => {
    const task = aTask({ description: 'Remove me' });
    const { user, onUpdate } = renderCard(task);

    await user.click(screen.getByText('Remove me'));
    await user.click(document.body);
    expect(onUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByText('Remove me'));
    await user.clear(screen.getByDisplayValue('Remove me'));
    await user.click(document.body);
    expect(onUpdate).toHaveBeenCalledWith(task.id, { description: null });
  });

  it('changes the priority from the badge menu', async () => {
    const task = aTask({ priority: 'medium' });
    const { user, onUpdate } = renderCard(task);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Change priority' }), 'high');

    expect(onUpdate).toHaveBeenCalledWith(task.id, { priority: 'high' });
  });

  it('hands the task over to another member', async () => {
    const task = aTask({ assignee: USER_A.email });
    const { user, onUpdate } = renderCard(task);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Reassign task' }), USER_B.email);

    expect(onUpdate).toHaveBeenCalledWith(task.id, { assignee: USER_B.email });
  });

  it('deletes the task from the actions menu', async () => {
    const task = aTask();
    const { user, onDelete } = renderCard(task);
    expect(screen.queryByRole('button', { name: /Delete Task/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('button', { name: /Delete Task/ }));

    expect(onDelete).toHaveBeenCalledWith(task.id);
    expect(screen.queryByRole('button', { name: /Delete Task/ })).not.toBeInTheDocument();
  });

  it('closes the actions menu when clicking elsewhere', async () => {
    const { user } = renderCard(aTask());
    await user.click(screen.getByRole('button', { name: 'More actions' }));

    await user.click(document.body);

    expect(screen.queryByRole('button', { name: /Delete Task/ })).not.toBeInTheDocument();
  });
});

describe('TaskCard: someone else\'s task', () => {
  const othersTask = () => aTask({ title: 'Not mine', assignee: USER_B.email, description: null });

  it('is read-only: no editing, no priority menu, no actions menu, assignee locked', async () => {
    const { user, onUpdate } = renderCard(othersTask(), USER_A.email);

    await user.click(screen.getByRole('heading', { name: 'Not mine' }));
    await user.click(screen.getByText('No description'));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Change priority' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('cannot be completed from the checkbox', async () => {
    const { onToggle } = renderCard(othersTask(), USER_A.email);

    // The checkbox ignores pointer events for non-owners; fire the click directly to be sure
    screen.getByRole('checkbox').click();

    expect(onToggle).not.toHaveBeenCalled();
  });
});
