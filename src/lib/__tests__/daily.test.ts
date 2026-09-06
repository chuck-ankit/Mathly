import { describe, expect, it } from 'vitest';
import { equationOfTheDay, DAILY_EQUATIONS } from '../../data/daily';
import { EXAMPLES } from '../../data/examples';
import { parse } from '../math/parser';

describe('equation of the day', () => {
  it('returns the same equation for the same date', () => {
    const d = new Date(2026, 8, 6);
    expect(equationOfTheDay(d).id).toBe(equationOfTheDay(new Date(2026, 8, 6)).id);
  });

  it('is deterministic for a whole week', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 7; i++) {
      ids.add(equationOfTheDay(new Date(2026, 8, 1 + i)).id);
    }
    expect(ids.size).toBeGreaterThanOrEqual(4);
  });

  it('rotates through the dataset', () => {
    const d1 = equationOfTheDay(new Date(2026, 0, 1));
    const d2 = equationOfTheDay(new Date(2026, 1, 1));
    expect(d1.id).not.toBe(d2.id);
  });

  it('has a rich dataset', () => {
    expect(DAILY_EQUATIONS.length).toBeGreaterThanOrEqual(20);
    for (const e of DAILY_EQUATIONS) {
      expect(e.whyInteresting.length).toBeGreaterThan(60);
      expect(e.funFact.length).toBeGreaterThan(40);
      expect(e.concepts.length).toBeGreaterThanOrEqual(2);
      expect(e.relatedExamples.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('graphable daily equations parse with the engine', () => {
    for (const e of DAILY_EQUATIONS) {
      if (e.visualization !== 'graph') continue;
      expect(() => parse(e.equation), `equation: ${e.equation}`).not.toThrow();
    }
  });
});

describe('example library integrity', () => {
  it('contains at least 100 curated examples', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(100);
  });

  it('has unique ids', () => {
    const ids = new Set(EXAMPLES.map((e) => e.id));
    expect(ids.size).toBe(EXAMPLES.length);
  });

  it('every example parses with the engine', () => {
    for (const e of EXAMPLES) {
      expect(() => parse(e.equation), `equation: ${e.equation} (${e.id})`).not.toThrow();
    }
  });

  it('every example has rich metadata', () => {
    for (const e of EXAMPLES) {
      expect(e.shortDescription.length).toBeGreaterThan(20);
      expect(e.educationalExplanation.length).toBeGreaterThan(80);
      expect(e.concepts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers all categories', () => {
    const cats = new Set(EXAMPLES.map((e) => e.category));
    expect(cats.size).toBeGreaterThanOrEqual(12);
  });

  it('related links point at existing examples', () => {
    for (const e of EXAMPLES) {
      for (const r of e.related ?? []) {
        expect(EXAMPLES.some((x) => x.id === r), `${e.id} → ${r}`).toBe(true);
      }
    }
  });
});

