import { describe, expect, it } from 'vitest';
import {
  parseCursorParams,
  parseDateRange,
  parseNumericRange,
  parsePaginationParams,
  parseSortParams,
} from './pagination';

describe('pagination utilities', () => {
  it('parses and bounds limit/offset/page values', () => {
    const byPage = parsePaginationParams({ limit: '500', page: '2' });
    expect(byPage.limit).toBe(100);
    expect(byPage.offset).toBe(100);

    const byOffset = parsePaginationParams({ limit: '10', offset: '30' });
    expect(byOffset).toEqual({ limit: 10, offset: 30 });
  });

  it('parses cursor and sorting params safely', () => {
    expect(parseCursorParams({ limit: '15', cursor: 'abc' })).toEqual({
      limit: 15,
      cursor: 'abc',
    });

    expect(
      parseSortParams(
        { sortBy: 'score', sortOrder: 'asc' },
        ['score', 'createdAt'],
        'createdAt'
      )
    ).toEqual({ sortBy: 'score', sortOrder: 'asc' });
  });

  it('parses numeric and date ranges from unknown inputs', () => {
    expect(parseNumericRange({ scoreMin: '1.5', scoreMax: '3.5' }, 'score')).toEqual({
      min: 1.5,
      max: 3.5,
    });

    const dateRange = parseDateRange({ from: '2026-01-01', to: '2026-01-31' });
    expect(dateRange.from?.toISOString().startsWith('2026-01-01')).toBe(true);
    expect(dateRange.to?.toISOString().startsWith('2026-01-31')).toBe(true);
  });
});
