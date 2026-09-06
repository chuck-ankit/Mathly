/* ============================================================
   Handwriting recognition abstraction.
   The UI depends only on this interface, so a real ML model
   (local or cloud) can be swapped in later without touching
   the drawing layer.
   ============================================================ */

export interface StrokePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number;
}

export interface Stroke {
  id: number;
  points: StrokePoint[];
}

export interface RecognitionResult {
  /** Recognized math expression in Mathly input syntax (may be empty). */
  expression: string;
  /** 0..1 — how confident the recognizer is. */
  confidence: number;
  /** Human-readable notes about limitations, for honest UX. */
  notes: string;
}

export interface HandwritingRecognizer {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  recognize(strokes: Stroke[]): Promise<RecognitionResult>;
}

/** The interface every future recognizer (ML etc.) must satisfy. */
export type { HandwritingRecognizer as HandwritingRecognizerInterface };