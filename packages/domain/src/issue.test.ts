import { describe, expect, it } from 'vitest';
import { canTransitionIssue, transitionIssue } from './issue.js';

describe('issue resolution lifecycle', () => {
  it('allows open → in progress → resolved', () => {
    expect(canTransitionIssue('open', 'in_progress')).toBe(true);
    expect(transitionIssue('in_progress', 'resolved')).toBe('resolved');
  });

  it('allows reopening from in progress', () => {
    expect(canTransitionIssue('in_progress', 'open')).toBe(true);
  });

  it('rejects transitions from resolved', () => {
    expect(canTransitionIssue('resolved', 'open')).toBe(false);
  });
});
