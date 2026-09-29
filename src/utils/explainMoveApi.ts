/**
 * Client-side utility for fetching human-readable beginner explanations from Gemini API
 */

export interface MoveExplanationParams {
  moveSan: string;
  color?: 'w' | 'b';
  classification?: string;
  evalBefore?: number;
  evalAfter?: number;
  bestMoveSan?: string;
  openingName?: string;
  fen?: string;
  moveNumber?: number;
}

// In-memory cache for fast lookup and instant re-reads
const explanationCache = new Map<string, string>();

export async function fetchBeginnerMoveExplanation(params: MoveExplanationParams): Promise<string> {
  const cacheKey = `${params.moveNumber || 1}_${params.color || 'w'}_${params.moveSan}_${params.classification || ''}_${params.bestMoveSan || ''}_${params.fen?.slice(0, 30) || ''}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }

  try {
    const response = await fetch('/api/analysis/explain-move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.explanation) {
        return errData.explanation;
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.explanation || 'Move analysis generated.';
    explanationCache.set(cacheKey, explanation);
    return explanation;
  } catch (error) {
    console.error('Failed to fetch beginner move explanation from Gemini:', error);
    const side = params.color === 'w' ? 'White' : 'Black';
    const fallback = `${side} played ${params.moveSan}. In this position, focus on piece safety, keeping your King safe, and looking for free undefended pieces.`;
    return fallback;
  }
}
