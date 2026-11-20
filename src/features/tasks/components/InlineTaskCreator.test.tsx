import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { USER_A, USER_B } from '../../../test/builders';
import { InlineTaskCreator } from './InlineTaskCreator';

function setup(assignee = USER_A.email) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<InlineTaskCreator assignee={assignee} onSubmit={onSubmit} inputId={`inline-creator-${assignee}`} />);
  const open = () => user.click(screen.getByRole('button', { name: 'Add a card' }));
  const titleInput = () => screen.getByPlaceholderText('Enter a title for this card...');
  return { onSubmit, user, open, titleInput };
}

describe('InlineTaskCreator', () => {
  it('starts closed, showing only "Add a card"', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Add a card' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('opens with the title field focused and carrying the given id', async () => {
    const { open, titleInput } = setup();
    await open();

    expect(titleInput()).toHaveFocus();
    expect(titleInput()).toHaveAttribute('id', `inline-creator-${USER_A.email}`);
  });

  it('Enter creates an open, medium-priority task for the column owner with the trimmed title', async () => {
    const { open, titleInput, user, onSubmit } = setup();
    await open();

    await user.type(titleInput(), '   Write the release notes  {Enter}');

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      title: 'Write the release notes',
      assignee: USER_A.email,
      priority: 'medium',
      status: 'pending',
    });
  });

  it('stays open and empty after creating, ready for the next card', async () => {
    const { open, titleInput, user } = setup();
    await open();

    await user.type(titleInput(), 'First{Enter}');

    expect(titleInput()).toHaveValue('');
    expect(titleInput()).toBeInTheDocument();
  });

  it('ignores Enter when the title is blank', async () => {
    const { open, titleInput, user, onSubmit } = setup();
    await open();

    await user.type(titleInput(), '    {Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the Enter hint only once something was typed', async () => {
    const { open, titleInput, user } = setup();
    await open();
    expect(screen.queryByText('Enter ⏎')).not.toBeInTheDocument();

    await user.type(titleInput(), 'x');

    expect(screen.getByText('Enter ⏎')).toBeInTheDocument();
  });

  it('creates the task with the priority picked from the menu', async () => {
    const { open, titleInput, user, onSubmit } = setup();
    await open();

    await user.click(screen.getByRole('button', { name: 'Medium' }));
    await user.click(screen.getByRole('button', { name: 'Low' }));
    expect(titleInput()).toHaveFocus();
    await user.type(titleInput(), 'Low key{Enter}');

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Low key', priority: 'low' }));
  });

  it('closes the priority menu when clicking anywhere else', async () => {
    const { open, user } = setup();
    await open();
    await user.click(screen.getByRole('button', { name: 'Medium' }));
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('button', { name: 'High' })).not.toBeInTheDocument();
  });

  it('Escape closes the creator and throws the draft away', async () => {
    const { open, titleInput, user, onSubmit } = setup();
    await open();
    await user.type(titleInput(), 'Draft{Escape}');

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await open();
    expect(titleInput()).toHaveValue('');
  });

  it('the cancel button closes it too', async () => {
    const { open, titleInput, user } = setup();
    await open();
    await user.type(titleInput(), 'Draft');

    await user.click(screen.getByTitle('Cancel (Esc)'));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('opens when the "New Task" button asks for this column, and only this one', () => {
    setup(USER_A.email);

    act(() => {
      window.dispatchEvent(new CustomEvent('open-inline-creator', { detail: { assignee: USER_B.email } }));
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent('open-inline-creator', { detail: { assignee: USER_A.email } }));
    });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
