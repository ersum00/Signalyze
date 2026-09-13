import { describe, expect, it } from 'vitest';
import { BADGE_STATES, isRuntimeMessage, isTabMessage } from './messages';

describe('isTabMessage', () => {
  it('accepts every well-formed tab message', () => {
    expect(isTabMessage({ type: 'GET_PLACE_CONTEXT' })).toBe(true);
    expect(isTabMessage({ type: 'CANCEL_COLLECT' })).toBe(true);
    expect(isTabMessage({ type: 'COLLECT_REVIEWS', limit: 200 })).toBe(true);
    for (const state of BADGE_STATES) {
      expect(isTabMessage({ type: 'SET_BADGE', score: 42, state })).toBe(true);
    }
    expect(isTabMessage({ type: 'SET_BADGE', score: null, state: 'insufficient' })).toBe(true);
  });

  it('rejects malformed or foreign values', () => {
    expect(isTabMessage(null)).toBe(false);
    expect(isTabMessage('GET_PLACE_CONTEXT')).toBe(false);
    expect(isTabMessage({ type: 'COLLECT_REVIEWS' })).toBe(false);
    expect(isTabMessage({ type: 'COLLECT_REVIEWS', limit: 'many' })).toBe(false);
    expect(isTabMessage({ type: 'SET_BADGE', score: 'x', state: 'done' })).toBe(false);
    expect(isTabMessage({ type: 'SET_BADGE', score: 1, state: 'unknown' })).toBe(false);
    expect(isTabMessage({ type: 'OPEN_SIDE_PANEL' })).toBe(false);
  });
});

describe('isRuntimeMessage', () => {
  it('accepts progress and open-panel messages only', () => {
    expect(isRuntimeMessage({ type: 'OPEN_SIDE_PANEL' })).toBe(true);
    expect(isRuntimeMessage({ type: 'COLLECT_PROGRESS', count: 10, limit: 200 })).toBe(true);
    expect(isRuntimeMessage({ type: 'COLLECT_PROGRESS', count: 10 })).toBe(false);
    expect(isRuntimeMessage({ type: 'GET_PLACE_CONTEXT' })).toBe(false);
    expect(isRuntimeMessage(undefined)).toBe(false);
  });
});
