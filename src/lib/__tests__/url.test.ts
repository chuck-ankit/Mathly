import { describe, expect, it } from 'vitest';
import { decodeGraphState, encodeGraphState } from '../url';

describe('graph URL encoding', () => {
  it('round-trips equations', () => {
    const state = { equations: ['y = x²', 'sin(x)'], viewport: null, presentation: false };
    const q = encodeGraphState(state);
    expect(decodeGraphState(q).equations).toEqual(['y = x²', 'sin(x)']);
  });

  it('round-trips the viewport', () => {
    const state = {
      equations: ['y = 2x'],
      viewport: { xmin: -5, xmax: 5, ymin: -3, ymax: 3 },
      presentation: false,
    };
    const q = encodeGraphState(state);
    const decoded = decodeGraphState(q);
    expect(decoded.viewport).not.toBeNull();
    expect(decoded.viewport!.xmin).toBeCloseTo(-5);
    expect(decoded.viewport!.ymax).toBeCloseTo(3);
  });

  it('handles presentation flag', () => {
    const state = { equations: [], viewport: null, presentation: true };
    expect(decodeGraphState(encodeGraphState(state)).presentation).toBe(true);
  });

  it('ignores garbage viewport values', () => {
    const decoded = decodeGraphState('v=1,2,3');
    expect(decoded.viewport).toBeNull();
  });
});