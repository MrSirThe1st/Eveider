import { describe, expect, it } from 'vitest';
import {
  compareValues,
  mergeSelection,
  nextSortState,
  pageCountFor,
  pageRangeLabel,
  paginationItems,
  resolveRowActions,
  shouldShowJumpTo,
  slicePage,
  toggleId,
} from './data-table-model.js';

describe('compareValues', () => {
  it('sorts numbers and French strings', () => {
    expect(compareValues(2, 10, 'asc')).toBeLessThan(0);
    expect(compareValues(2, 10, 'desc')).toBeGreaterThan(0);
    expect(compareValues('alice', 'Émile', 'asc')).toBeLessThan(0);
    expect(compareValues(null, 'a', 'asc')).toBeGreaterThan(0);
  });
});

describe('nextSortState', () => {
  it('cycles unsorted → asc → desc → unsorted', () => {
    const first = nextSortState({ id: null, direction: 'asc' }, 'name');
    expect(first).toEqual({ id: 'name', direction: 'asc' });
    const second = nextSortState(first, 'name');
    expect(second).toEqual({ id: 'name', direction: 'desc' });
    expect(nextSortState(second, 'name')).toEqual({ id: null, direction: 'asc' });
  });

  it('can keep a column sorted when unsorted is disabled', () => {
    expect(nextSortState({ id: 'name', direction: 'desc' }, 'name', false)).toEqual({
      id: 'name',
      direction: 'asc',
    });
  });
});

describe('pagination', () => {
  it('slices pages and formats the range', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(slicePage(rows, 0, 2)).toEqual([1, 2]);
    expect(slicePage(rows, 2, 2)).toEqual([5]);
    expect(pageCountFor(5, 2)).toBe(3);
    expect(pageRangeLabel(0, 25, 142)).toBe('1–25 sur 142');
    expect(pageRangeLabel(5, 25, 142)).toBe('126–142 sur 142');
  });

  it('builds compact page lists with ellipses', () => {
    expect(paginationItems(0, 1)).toEqual([0]);
    expect(paginationItems(0, 6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(paginationItems(0, 10)).toEqual([0, 1, 'ellipsis', 9]);
    expect(paginationItems(4, 10)).toEqual([0, 'ellipsis', 3, 4, 5, 'ellipsis', 9]);
    expect(shouldShowJumpTo(6)).toBe(false);
    expect(shouldShowJumpTo(7)).toBe(true);
  });
});

describe('resolveRowActions', () => {
  const action = (id: string) => ({ id, label: id });

  it('shows one or two actions directly', () => {
    expect(resolveRowActions(action('view'), [])).toEqual({
      visible: [action('view')],
      overflow: [],
    });
    expect(resolveRowActions(null, [action('view'), action('edit')])).toEqual({
      visible: [action('view'), action('edit')],
      overflow: [],
    });
  });

  it('keeps a primary visible and overflows the rest when there are three or more', () => {
    expect(resolveRowActions(action('view'), [action('edit'), action('archive')])).toEqual({
      visible: [action('view')],
      overflow: [action('edit'), action('archive')],
    });
    expect(resolveRowActions(null, [action('a'), action('b'), action('c')])).toEqual({
      visible: [],
      overflow: [action('a'), action('b'), action('c')],
    });
  });
});

describe('selection helpers', () => {
  it('toggles and merges visible ids', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
    expect(mergeSelection(['a'], ['b', 'c'], true)).toEqual(['a', 'b', 'c']);
    expect(mergeSelection(['a', 'b', 'c'], ['b'], false)).toEqual(['a', 'c']);
  });
});
