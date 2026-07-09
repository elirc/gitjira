import { describe, it, expect } from 'vitest';
import { groupByColumn, positionForDrop } from '../src/lib/board.js';

const columns = [{ id: 'c1' }, { id: 'c2' }];
const issues = [
  { id: 'a', columnId: 'c1', position: 'b' },
  { id: 'b', columnId: 'c1', position: 'd' },
  { id: 'c', columnId: 'c2', position: 'c' },
];

describe('groupByColumn', () => {
  it('buckets issues by column, sorted by position', () => {
    const g = groupByColumn(issues, columns);
    expect(g.get('c1').map((i) => i.id)).toEqual(['a', 'b']);
    expect(g.get('c2').map((i) => i.id)).toEqual(['c']);
  });
});

describe('positionForDrop', () => {
  it('drop at the top yields a key before the first', () => {
    const col = [
      { id: 'a', position: 'b' },
      { id: 'b', position: 'd' },
    ];
    const pos = positionForDrop(col, 0, 'x');
    expect(pos < 'b').toBe(true);
  });

  it('drop between two yields a key strictly between them', () => {
    const col = [
      { id: 'a', position: 'b' },
      { id: 'b', position: 'd' },
    ];
    const pos = positionForDrop(col, 1, 'x');
    expect('b' < pos && pos < 'd').toBe(true);
  });

  it('excludes the moving card from neighbor math', () => {
    const col = [
      { id: 'a', position: 'b' },
      { id: 'move', position: 'c' },
      { id: 'b', position: 'd' },
    ];
    // dropping "move" at index 2 (end) should place it after 'd'
    const pos = positionForDrop(col, 2, 'move');
    expect(pos > 'd').toBe(true);
  });
});
