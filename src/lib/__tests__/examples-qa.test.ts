import { describe, expect, it } from 'vitest';
import { EXAMPLES, getExample, relatedExamples, searchExamples } from '../../data/examples';
import { parse } from '../math/parser';
import { SOLIDS, SOLID_GROUPS } from '../../data/solids';

describe('examples data QA', () => {
  it('every example equation parses', () => {
    const bad: string[] = [];
    for (const e of EXAMPLES) {
      try {
        parse(e.equation);
      } catch (err) {
        bad.push(`${e.id}: ${String(err)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every related id resolves to a real example', () => {
    const missing: string[] = [];
    for (const e of EXAMPLES) {
      for (const rid of e.related ?? []) {
        if (!getExample(rid)) missing.push(`${e.id} -> ${rid}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('example ids are unique', () => {
    const ids = EXAMPLES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('unique titles', () => {
    const titles = EXAMPLES.map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('at least 100 curated examples', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(100);
  });

  it('search + related return sensible results', () => {
    expect(searchExamples('parabola', 'All', 'All').length).toBeGreaterThan(0);
    for (const e of EXAMPLES.slice(0, 20)) {
      const r = relatedExamples(e.id);
      expect(r.every((x) => x.id !== e.id)).toBe(true);
    }
  });
});

describe('solids data QA', () => {
  it('every solid builds a healthy mesh', () => {
    for (const s of SOLIDS) {
      const m = s.build();
      expect(m.tris.length).toBeGreaterThan(0);
      for (const t of m.tris) {
        for (const v of [t.a, t.b, t.c]) {
          expect(Number.isFinite(v.x)).toBe(true);
          expect(Number.isFinite(v.y)).toBe(true);
          expect(Number.isFinite(v.z)).toBe(true);
        }
      }
    }
  });

  it('groups are all valid', () => {
    for (const s of SOLIDS) expect(SOLID_GROUPS).toContain(s.group);
  });

  it('ids and names are unique', () => {
    const ids = SOLIDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = SOLIDS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});