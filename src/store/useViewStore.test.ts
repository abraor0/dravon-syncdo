import { beforeEach, describe, expect, it } from 'vitest';
import { useViewStore } from './useViewStore';

const STORAGE_KEY = 'syncdo-view-storage';
const view = () => useViewStore.getState();

beforeEach(() => {
  useViewStore.setState({ viewedUsers: [], sortConfig: {} });
});

describe('useViewStore', () => {
  it('starts with no columns and no sort choices', () => {
    expect(view().viewedUsers).toEqual([]);
    expect(view().sortConfig).toEqual({});
  });

  it('addViewedUser appends a column once, keeping the order they were added in', () => {
    view().addViewedUser('example1@example.com');
    view().addViewedUser('example2@example.com');
    view().addViewedUser('example1@example.com');

    expect(view().viewedUsers).toEqual(['example1@example.com', 'example2@example.com']);
  });

  it('removeViewedUser drops only that column', () => {
    useViewStore.setState({ viewedUsers: ['example1@example.com', 'example2@example.com'] });

    view().removeViewedUser('example1@example.com');

    expect(view().viewedUsers).toEqual(['example2@example.com']);
  });

  it('setSortForUser stores a sort per column without touching the others', () => {
    view().setSortForUser('example1@example.com', 'priority');
    view().setSortForUser('example2@example.com', 'date_asc');
    view().setSortForUser('example1@example.com', 'status');

    expect(view().sortConfig).toEqual({
      'example1@example.com': 'status',
      'example2@example.com': 'date_asc',
    });
  });

  it('clearView resets columns and sort choices', () => {
    useViewStore.setState({ viewedUsers: ['example1@example.com'], sortConfig: { 'example1@example.com': 'priority' } });

    view().clearView();

    expect(view().viewedUsers).toEqual([]);
    expect(view().sortConfig).toEqual({});
  });

  it('saves the layout in localStorage so it survives a reload', () => {
    view().addViewedUser('example2@example.com');
    view().setSortForUser('example2@example.com', 'priority');

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.version).toBe(1);
    expect(saved.state).toEqual({
      viewedUsers: ['example2@example.com'],
      sortConfig: { 'example2@example.com': 'priority' },
    });
  });

  it('restores a saved layout of the current version', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      state: { viewedUsers: ['example2@example.com'], sortConfig: { 'example2@example.com': 'status' } },
    }));

    await useViewStore.persist.rehydrate();

    expect(view().viewedUsers).toEqual(['example2@example.com']);
    expect(view().sortConfig).toEqual({ 'example2@example.com': 'status' });
  });

  it('discards a layout saved by an older version (columns were keyed by name, not email)', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 0,
      state: { viewedUsers: ['Example User 2'], sortConfig: { 'Example User 2': 'priority' } },
    }));

    await useViewStore.persist.rehydrate();

    expect(view().viewedUsers).toEqual([]);
    expect(view().sortConfig).toEqual({});
  });
});
