import type { GenerationFocus } from '../../lib/api/assessmentGeneration';

interface SignatureInput {
  readingText: string;
  purpose?: string;
  questionCount: number;
  focus: GenerationFocus;
}

/**
 * Huella determinista de los datos que se envían al asistente. Se conserva junto a la
 * propuesta para invalidarla en cuanto cambie la lectura, el propósito, la cantidad
 * solicitada o el foco diagnóstico, incluso si la respuesta llega tarde.
 *
 * Se serializa el contenido íntegro en lugar de resumirlo con un hash no criptográfico:
 * la comparación debe ser exacta y no puede admitir colisiones.
 */
export function generationSignature(input: SignatureInput): string {
  return JSON.stringify([
    input.readingText.trim(),
    input.purpose?.trim() ?? '',
    input.questionCount,
    input.focus,
  ]);
}
