import { describe, expect, it } from 'vitest';
import { createIssueSchema, listIssuesQuerySchema, updateIssueStatusSchema } from './issue.js';

describe('createIssueSchema', () => {
  it('accepts valid issue input', () => {
    const result = createIssueSchema.safeParse({
      type: 'parcel_problem',
      parcelId: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Colis endommagé',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing description', () => {
    const result = createIssueSchema.safeParse({
      type: 'locker_unavailable',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateIssueStatusSchema', () => {
  it('accepts valid status', () => {
    expect(updateIssueStatusSchema.safeParse({ status: 'in_progress' }).success).toBe(true);
  });
});

describe('listIssuesQuerySchema', () => {
  it('accepts optional status filter', () => {
    expect(listIssuesQuerySchema.safeParse({ status: 'open' }).success).toBe(true);
    expect(listIssuesQuerySchema.safeParse({}).success).toBe(true);
  });
});
