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
  signal?: AbortSignal;
}

export interface MoveExplanationResult {
  explanation: string;
  isAiGenerated: boolean;
  isFallback: boolean;
  error?: string;
}

// In-memory cache for fast lookup and instant re-reads
const explanationCache = new Map<string, MoveExplanationResult>();

export async function fetchBeginnerMoveExplanation(
  params: MoveExplanationParams
): Promise<MoveExplanationResult> {
  const cacheKey = `${params.moveNumber || 1}_${params.color || 'w'}_${params.moveSan}_${params.classification || ''}_${params.bestMoveSan || ''}_${params.fen?.slice(0, 30) || ''}`;

  if (explanationCache.has(cacheKey)) {
    return explanationCache.get(cacheKey)!;
  }

  const side = params.color === 'w' ? 'White' : 'Black';

  try {
    const { signal, ...bodyPayload } = params;
    const response = await fetch('/api/analysis/explain-move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.explanation) {
        const res: MoveExplanationResult = {
          explanation: errData.explanation,
          isAiGenerated: true,
          isFallback: false,
        };
        explanationCache.set(cacheKey, res);
        return res;
      }
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.explanation || `${side} played ${params.moveSan}.`;
    const result: MoveExplanationResult = {
      explanation,
      isAiGenerated: true,
      isFallback: false,
    };
    explanationCache.set(cacheKey, result);
    return result;
  } catch (error: any) {
    if (error?.name === 'AbortError' || params.signal?.aborted) {
      throw error;
    }

    const classificationText = params.classification ? `(${params.classification})` : '';
    const fallback = `${side} played ${params.moveSan} ${classificationText}. In this position, maintain control over key center squares, keep king safety in mind, and ensure all minor pieces are properly defended.`;

    const fallbackResult: MoveExplanationResult = {
      explanation: fallback,
      isAiGenerated: false,
      isFallback: true,
      error: error?.message || 'AI service unavailable',
    };
    return fallbackResult;
  }
}

