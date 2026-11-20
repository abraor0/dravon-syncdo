import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../../supabaseClient';
import { aSession, aTask, queryWrapper, USER_A } from '../../../test/builders';
import { tasksApi, type Task } from '../services/tasks.api';
import { useTasks } from './useTasks';

vi.mock('../../../supabaseClient', () => ({
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));
vi.mock('../services/tasks.api', () => ({
  tasksApi: { fetchTasks: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn() },
}));

const api = vi.mocked(tasksApi);
const channelFactory = vi.mocked(supabase.channel);
const removeChannel = vi.mocked(supabase.removeChannel);

// React Query hands cache updates to components on a zero-delay timer, so assertions about
// the task list wait for the next render with waitFor.

// The realtime channel: we keep the change handler the hook registers so tests can push events.
let pushChange: (payload: Partial<RealtimePostgresChangesPayload<Task>>) => void;
const channel = { on: vi.fn(), subscribe: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  channel.on.mockImplementation((_type: string, _filter: unknown, handler: typeof pushChange) => {
    pushChange = payload => act(() => handler(payload));
    return channel;
  });
  channel.subscribe.mockReturnValue(channel);
  channelFactory.mockReturnValue(channel as unknown as ReturnType<typeof supabase.channel>);
  api.fetchTasks.mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function renderSignedIn(initialTasks: Task[] = []) {
  api.fetchTasks.mockResolvedValue(initialTasks);
  const harness = queryWrapper();
  const session = aSession(); // one object, like the store keeps between renders
  const hook = renderHook(() => useTasks(session, USER_A.email), harness);
  await waitFor(() => expect(hook.result.current.tasks).toEqual(initialTasks));
  return hook;
}

const titles = (tasks: Task[]) => tasks.map(t => t.title);

describe('useTasks: loading and realtime', () => {
  it('does nothing while signed out: no fetch and no realtime subscription', () => {
    renderHook(() => useTasks(null, ''), queryWrapper());

    expect(api.fetchTasks).not.toHaveBeenCalled();
    expect(channelFactory).not.toHaveBeenCalled();
  });

  it('loads the tasks once signed in', async () => {
    const tasks = [aTask({ title: 'A' }), aTask({ title: 'B' })];
    const { result } = await renderSignedIn(tasks);

    expect(result.current.tasks).toEqual(tasks);
    expect(result.current.isLoading).toBe(false);
  });

  it('subscribes to every change on public.tasks and unsubscribes on unmount', async () => {
    const { unmount } = await renderSignedIn();

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    unmount();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it('adds a task created elsewhere, replaces an updated one and drops a deleted one', async () => {
    const kept = aTask({ title: 'Kept' });
    const changed = aTask({ title: 'Before' });
    const { result } = await renderSignedIn([kept, changed]);

    pushChange({ eventType: 'INSERT', new: aTask({ title: 'Created elsewhere' }) });
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Created elsewhere', 'Kept', 'Before']));

    pushChange({ eventType: 'UPDATE', new: { ...changed, title: 'After' } });
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Created elsewhere', 'Kept', 'After']));

    pushChange({ eventType: 'DELETE', old: { id: kept.id } });
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Created elsewhere', 'After']));
  });
});

describe('useTasks: updateTask', () => {
  it('shows the change immediately, then keeps the row the server returned', async () => {
    const task = aTask({ title: 'Old' });
    const { result } = await renderSignedIn([task]);
    let finishSave!: (row: Task) => void;
    api.updateTask.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));

    let saving!: Promise<void>;
    act(() => { saving = result.current.updateTask(task.id, { title: 'New' }); });
    await waitFor(() => expect(result.current.tasks[0].title).toBe('New'));

    await act(async () => {
      finishSave({ ...task, title: 'New (as stored)' });
      await saving;
    });
    await waitFor(() => expect(result.current.tasks[0].title).toBe('New (as stored)'));
    expect(api.updateTask).toHaveBeenCalledWith(task.id, { title: 'New' });
  });

  it('on failure shows an error and reloads the tasks from the server', async () => {
    const task = aTask({ title: 'Server value' });
    const { result } = await renderSignedIn([task]);
    api.updateTask.mockRejectedValue(new Error('Tasks can only be assigned to an existing member'));

    await act(() => result.current.updateTask(task.id, { assignee: 'nobody@example.com' }));

    expect(result.current.error).toBe('Could not save the task: Tasks can only be assigned to an existing member');
    await waitFor(() => expect(api.fetchTasks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.tasks[0].assignee).toBe(task.assignee));
  });

  it('uses a generic message when the failure has no text', async () => {
    const task = aTask();
    const { result } = await renderSignedIn([task]);
    api.updateTask.mockRejectedValue('offline');

    await act(() => result.current.updateTask(task.id, { title: 'x' }));

    expect(result.current.error).toBe('Could not save the task');
  });

  it('clearError hides the message', async () => {
    const task = aTask();
    const { result } = await renderSignedIn([task]);
    api.updateTask.mockRejectedValue(new Error('boom'));
    await act(() => result.current.updateTask(task.id, { title: 'x' }));

    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });
});

describe('useTasks: toggleTask', () => {
  it('completing an open task sends the status, the current member and a timestamp', async () => {
    const task = aTask({ status: 'pending' });
    const { result } = await renderSignedIn([task]);
    api.updateTask.mockImplementation(async (_id, updates) => ({ ...task, ...updates }) as Task);

    await act(() => result.current.toggleTask(task.id, 'pending'));

    expect(api.updateTask).toHaveBeenCalledWith(task.id, {
      status: 'completed',
      completed_by: USER_A.email,
      completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    await waitFor(() => expect(result.current.tasks[0].status).toBe('completed'));
  });

  it('reopening a completed task clears the completion fields', async () => {
    const task = aTask({ status: 'completed', completed_at: '2026-06-01T10:00:00.000Z', completed_by: USER_A.email });
    const { result } = await renderSignedIn([task]);
    api.updateTask.mockImplementation(async (_id, updates) => ({ ...task, ...updates }) as Task);

    await act(() => result.current.toggleTask(task.id, 'completed'));

    expect(api.updateTask).toHaveBeenCalledWith(task.id, { status: 'pending', completed_at: null, completed_by: null });
    await waitFor(() => expect(result.current.tasks[0]).toMatchObject({ status: 'pending', completed_by: null }));
  });
});

describe('useTasks: deleteTask', () => {
  it('removes the task right away', async () => {
    const [first, second] = [aTask({ title: 'First' }), aTask({ title: 'Second' })];
    const { result } = await renderSignedIn([first, second]);
    api.deleteTask.mockResolvedValue(true);

    await act(() => result.current.deleteTask(first.id));

    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Second']));
    expect(api.deleteTask).toHaveBeenCalledWith(first.id);
  });

  it('brings the task back with an error when the server refuses', async () => {
    const task = aTask({ title: 'Protected' });
    const { result } = await renderSignedIn([task]);
    api.deleteTask.mockRejectedValue(new Error('You do not have permission to delete this task.'));

    await act(() => result.current.deleteTask(task.id));

    expect(result.current.error).toBe('Could not delete the task: You do not have permission to delete this task.');
    await waitFor(() => expect(api.fetchTasks).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Protected']));
  });
});

describe('useTasks: createTask', () => {
  it('adds the stored task, and the matching realtime INSERT does not duplicate it', async () => {
    const { result } = await renderSignedIn([aTask({ title: 'Existing' })]);
    const stored = aTask({ title: 'Brand new' });
    api.createTask.mockResolvedValue(stored);

    await act(() => result.current.createTask({ title: 'Brand new', assignee: USER_A.email }));
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Brand new', 'Existing']));

    pushChange({ eventType: 'INSERT', new: { ...stored, title: 'Brand new (realtime copy)' } });
    // Same id: the realtime row replaces the stored one instead of being added a second time
    await waitFor(() => expect(titles(result.current.tasks)).toEqual(['Brand new (realtime copy)', 'Existing']));
  });

  it('shows an error when the server refuses the new task', async () => {
    const { result } = await renderSignedIn();
    api.createTask.mockRejectedValue(new Error('New tasks must start as pending'));

    await act(() => result.current.createTask({ title: 'x', assignee: USER_A.email, status: 'completed' }));

    expect(result.current.error).toBe('Could not create the task: New tasks must start as pending');
    expect(result.current.tasks).toEqual([]);
  });
});
