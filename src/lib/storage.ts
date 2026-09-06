/* ============================================================
   Guest-session persistence. Nothing sensitive is stored.
   ============================================================ */

const KEY = 'mathly:session:v1';

export interface StoredSession {
  equations: { id: string; input: string; visible: boolean; colorIndex: number }[];
  viewport: { xmin: number; xmax: number; ymin: number; ymax: number } | null;
  presentation: boolean;
}

const EMPTY: StoredSession = { equations: [], viewport: null, presentation: false };

export function loadSession(): StoredSession {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    return {
      equations: Array.isArray(parsed.equations) ? parsed.equations : [],
      viewport: parsed.viewport && isViewport(parsed.viewport) ? parsed.viewport : null,
      presentation: Boolean(parsed.presentation),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage may be unavailable — guest mode still works */
  }
}

function isViewport(v: unknown): v is StoredSession['viewport'] {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.xmin === 'number' &&
    typeof o.xmax === 'number' &&
    typeof o.ymin === 'number' &&
    typeof o.ymax === 'number' &&
    Number.isFinite(o.xmin as number) &&
    Number.isFinite(o.xmax as number) &&
    (o.xmax as number) > (o.xmin as number)
  );
}

/** Store tiny non-sensitive preferences (like last equation for the hero). */
export function storePreference(key: string, value: string): void {
  try {
    localStorage.setItem(`mathly:pref:${key}`, value);
  } catch {
    /* ignore */
  }
}

export function loadPreference(key: string): string | null {
  try {
    return localStorage.getItem(`mathly:pref:${key}`);
  } catch {
    return null;
  }
}