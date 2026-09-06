import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Viewport } from '../lib/math/sample';
import { DEFAULT_VIEWPORT } from '../lib/graph/viewport';
import { loadSession, saveSession } from '../lib/storage';
import { decodeGraphState } from '../lib/url';
import { CURVE_COLORS } from '../lib/graph/pipeline';

export interface WorkspaceEquation {
  id: string;
  input: string;
  visible: boolean;
  colorIndex: number;
}

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `eq-${Date.now().toString(36)}-${idCounter}`;
}

export const DEFAULT_EQUATION = 'y = x²';

function defaultEquation(): WorkspaceEquation {
  return { id: newId(), input: DEFAULT_EQUATION, visible: true, colorIndex: 0 };
}

interface WorkspaceApi {
  equations: WorkspaceEquation[];
  params: Record<string, Record<string, number>>;
  viewport: Viewport;
  presentation: boolean;
  focusedId: string | null;
  gridVisible: boolean;
  updateInput: (id: string, value: string) => void;
  addEquation: (input?: string) => string;
  removeEquation: (id: string) => void;
  duplicateEquation: (id: string) => void;
  toggleVisible: (id: string) => void;
  focusRow: (id: string) => void;
  setViewport: (vp: Viewport) => void;
  resetViewport: () => void;
  setPresentation: (on: boolean) => void;
  setGridVisible: (on: boolean) => void;
  setParam: (id: string, name: string, value: number) => void;
  setParams: (id: string, values: Record<string, number>) => void;
  loadEquations: (inputs: string[]) => void;
}

export function useWorkspace(forcePresentation = false): WorkspaceApi {
  const initial = useMemo(() => {
    const url = typeof window !== 'undefined' ? decodeGraphState(window.location.search) : null;
    let equations: WorkspaceEquation[];
    let viewport: Viewport = DEFAULT_VIEWPORT;
    let presentation = forcePresentation;
    let params: Record<string, Record<string, number>> = {};

    if (url && url.equations.length > 0) {
      equations = url.equations.map((input, i) => ({
        id: newId(),
        input,
        visible: true,
        colorIndex: i % CURVE_COLORS.length,
      }));
      if (url.viewport) viewport = url.viewport;
      presentation = presentation || url.presentation;
    } else {
      const stored = loadSession();
      equations =
        stored.equations.length > 0
          ? stored.equations.map((e, i) => ({
              id: e.id || newId(),
              input: e.input,
              visible: e.visible !== false,
              colorIndex: typeof e.colorIndex === 'number' ? e.colorIndex : i % CURVE_COLORS.length,
            }))
          : [defaultEquation()];
      if (stored.viewport) viewport = stored.viewport;
      presentation = presentation || stored.presentation;
    }
    return { equations, viewport, presentation, params };
  }, [forcePresentation]);

  const [equations, setEquations] = useState<WorkspaceEquation[]>(initial.equations);
  const [params, setParamsState] = useState<Record<string, Record<string, number>>>(initial.params);
  const [viewport, setViewportState] = useState<Viewport>(initial.viewport);
  const [presentation, setPresentationState] = useState(initial.presentation);
  const [focusedId, setFocusedId] = useState<string | null>(initial.equations[0]?.id ?? null);
  const [gridVisible, setGridVisibleState] = useState(true);
  const equationsRef = useRef(equations);
  equationsRef.current = equations;

  // Persist guest session (debounced)
  useEffect(() => {
    const t = window.setTimeout(() => {
      saveSession({
        equations: equations.map((e) => ({
          id: e.id,
          input: e.input,
          visible: e.visible,
          colorIndex: e.colorIndex,
        })),
        viewport,
        presentation,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [equations, viewport, presentation]);

  const updateInput = useCallback((id: string, value: string) => {
    setEquations((eqs) => eqs.map((e) => (e.id === id ? { ...e, input: value } : e)));
    setFocusedId(id);
  }, []);

  const addEquation = useCallback((input = ''): string => {
    const id = newId();
    setEquations((eqs) => [
      ...eqs,
      {
        id,
        input,
        visible: true,
        colorIndex: eqs.length % CURVE_COLORS.length,
      },
    ]);
    setFocusedId(id);
    return id;
  }, []);

  const removeEquation = useCallback((id: string) => {
    setEquations((eqs) => {
      const next = eqs.filter((e) => e.id !== id);
      if (next.length === 0) {
        return [defaultEquation()];
      }
      return next;
    });
    setParamsState((p) => {
      const copy = { ...p };
      delete copy[id];
      return copy;
    });
    setFocusedId((f) => (f === id ? null : f));
  }, []);

  const duplicateEquation = useCallback((id: string) => {
    setEquations((eqs) => {
      const idx = eqs.findIndex((e) => e.id === id);
      if (idx === -1) return eqs;
      const src = eqs[idx];
      const copy: WorkspaceEquation = {
        ...src,
        id: newId(),
        input: src.input,
        colorIndex: (src.colorIndex + 1) % CURVE_COLORS.length,
      };
      const next = [...eqs];
      next.splice(idx + 1, 0, copy);
      setFocusedId(copy.id);
      return next;
    });
  }, []);

  const toggleVisible = useCallback((id: string) => {
    setEquations((eqs) => eqs.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));
  }, []);

  const focusRow = useCallback((id: string) => setFocusedId(id), []);

  const setViewport = useCallback((vp: Viewport) => setViewportState(vp), []);
  const resetViewport = useCallback(() => setViewportState(DEFAULT_VIEWPORT), []);
  const setPresentation = useCallback((on: boolean) => setPresentationState(on), []);
  const setGridVisible = useCallback((on: boolean) => setGridVisibleState(on), []);

  const setParam = useCallback((id: string, name: string, value: number) => {
    setParamsState((p) => ({
      ...p,
      [id]: { ...(p[id] ?? {}), [name]: value },
    }));
  }, []);

  const setParams = useCallback((id: string, values: Record<string, number>) => {
    setParamsState((p) => ({ ...p, [id]: { ...values } }));
  }, []);

  const loadEquations = useCallback((inputs: string[]) => {
    setEquations(
      inputs.map((input, i) => ({
        id: newId(),
        input,
        visible: true,
        colorIndex: i % CURVE_COLORS.length,
      }))
    );
    setViewportState(DEFAULT_VIEWPORT);
    setPresentationState(false);
  }, []);

  return {
    equations,
    params,
    viewport,
    presentation,
    focusedId,
    gridVisible,
    updateInput,
    addEquation,
    removeEquation,
    duplicateEquation,
    toggleVisible,
    focusRow,
    setViewport,
    resetViewport,
    setPresentation,
    setGridVisible,
    setParam,
    setParams,
    loadEquations,
  };
}

export function paramRanges(name: string): { min: number; max: number; step: number } {
  const ranges: Record<string, { min: number; max: number; step: number }> = {
    a: { min: -4, max: 4, step: 0.1 },
    b: { min: -10, max: 10, step: 0.1 },
    c: { min: -10, max: 10, step: 0.1 },
    m: { min: -5, max: 5, step: 0.1 },
    k: { min: -4, max: 4, step: 0.1 },
  };
  return ranges[name] ?? { min: -10, max: 10, step: 0.1 };
}