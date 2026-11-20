import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../supabaseClient';
import { recordQuery, type RecordedQuery } from '../../../test/queryRecorder';
import { aTask } from '../../../test/builders';
import { tasksApi } from './tasks.api';

vi.mock('../../../supabaseClient', () => ({ supabase: { from: vi.fn() } }));

const from = vi.mocked(supabase.from);

function respondWith(result: { data: unknown; error: unknown }): RecordedQuery {
  const query = recordQuery(result);
  from.mockReturnValue(query.builder as ReturnType<typeof supabase.from>);
  return query;
}

beforeEach(() => {
  from.mockReset();
});

describe('tasksApi.fetchTasks', () => {
  it('reads every task from the tasks table, newest first', async () => {
    const rows = [aTask(), aTask()];
    const query = respondWith({ data: rows, error: null });

    await expect(tasksApi.fetchTasks()).resolves.toEqual(rows);

    expect(from).toHaveBeenCalledWith('tasks');
    expect(query.calls).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]);
  });

  it('returns an empty list when the API sends no rows', async () => {
    respondWith({ data: null, error: null });
    await expect(tasksApi.fetchTasks()).resolves.toEqual([]);
  });

  it('throws the API error', async () => {
    const failure = new Error('fetch failed');
    respondWith({ data: null, error: failure });
    await expect(tasksApi.fetchTasks()).rejects.toBe(failure);
  });
});

describe('tasksApi.createTask', () => {
  it('inserts one row and returns the stored task', async () => {
    const stored = aTask({ title: 'Example new task' });
    const query = respondWith({ data: stored, error: null });
    const input = { title: 'Example new task', assignee: stored.assignee, priority: 'high' };

    await expect(tasksApi.createTask(input)).resolves.toBe(stored);

    expect(query.calls).toEqual([
      { method: 'insert', args: [[input]] },
      { method: 'select', args: [] },
      { method: 'single', args: [] },
    ]);
  });

  it('throws when the insert is rejected', async () => {
    const failure = new Error('new row violates row-level security policy');
    respondWith({ data: null, error: failure });
    await expect(tasksApi.createTask({ title: 'x', assignee: 'example2@example.com' })).rejects.toBe(failure);
  });
});

describe('tasksApi.updateTask', () => {
  it('updates the task with the given id and returns the stored row', async () => {
    const stored = aTask({ id: 42, title: 'Renamed' });
    const query = respondWith({ data: stored, error: null });

    await expect(tasksApi.updateTask(42, { title: 'Renamed' })).resolves.toBe(stored);

    expect(query.calls).toEqual([
      { method: 'update', args: [{ title: 'Renamed' }] },
      { method: 'eq', args: ['id', 42] },
      { method: 'select', args: [] },
      { method: 'single', args: [] },
    ]);
  });

  it('throws when the update is rejected, e.g. when no row is visible to the member', async () => {
    const failure = new Error('JSON object requested, multiple (or no) rows returned');
    respondWith({ data: null, error: failure });
    await expect(tasksApi.updateTask(7, { title: 'x' })).rejects.toBe(failure);
  });
});

describe('tasksApi.deleteTask', () => {
  it('deletes the task with the given id and resolves to true', async () => {
    const query = respondWith({ data: [{ id: 9 }], error: null });

    await expect(tasksApi.deleteTask(9)).resolves.toBe(true);

    expect(query.calls).toEqual([
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 9] },
      { method: 'select', args: ['id'] },
    ]);
  });

  it('reports a permission error when no row was deleted (RLS hides it silently)', async () => {
    respondWith({ data: [], error: null });
    await expect(tasksApi.deleteTask(9)).rejects.toThrow('You do not have permission to delete this task.');
  });

  it('throws the API error', async () => {
    const failure = new Error('delete failed');
    respondWith({ data: null, error: failure });
    await expect(tasksApi.deleteTask(9)).rejects.toBe(failure);
  });
});
