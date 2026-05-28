/**
 * Encoding simple para el Modo Reto.
 *
 * Empaqueta tres valores en un código de 6 caracteres base36 (mayúsculas + dígitos):
 *   - stepsK: pasos del día en miles redondeados (0–99, cap en 99)
 *   - streak:  racha actual (0–999, cap en 999)
 *   - mission: primer carácter de la descripción de misión (A–Z → 0–25)
 *
 * Fórmula: value = stepsK * 26_000 + streak * 26 + missionNum
 *
 * Máximo value = 99 * 26_000 + 999 * 26 + 25 = 2_599_999  (5 dígitos base36),
 * siempre padded a 6 caracteres con '0' a la izquierda.
 *
 * No es criptográfico — es para demo/juego, no para seguridad.
 */

const STEP_MULTIPLIER = 26_000;
const STREAK_MULTIPLIER = 26;

export function generateCode(
  steps: number,
  streak: number,
  missionLabel: string,
): string {
  const stepsK = Math.min(Math.round(steps / 1000), 99);
  const streakCapped = Math.min(Math.max(0, Math.round(streak)), 999);

  const firstChar = missionLabel.trim().charAt(0).toUpperCase();
  const charCode = firstChar.charCodeAt(0) - 65; // A=0 … Z=25
  const missionNum = charCode >= 0 && charCode <= 25 ? charCode : 0;

  const value = stepsK * STEP_MULTIPLIER + streakCapped * STREAK_MULTIPLIER + missionNum;
  return value.toString(36).toUpperCase().padStart(6, '0');
}

export type DecodedChallenge = {
  steps: number;
  streak: number;
  missionLabel: string;
};

export function decodeCode(code: string): DecodedChallenge | null {
  if (!/^[0-9A-Za-z]{6}$/.test(code)) return null;

  const value = parseInt(code, 36);
  if (!Number.isFinite(value) || value < 0) return null;

  const missionNum = value % STREAK_MULTIPLIER;
  const remaining = Math.floor(value / STREAK_MULTIPLIER);
  const streak = remaining % 1000;
  const stepsK = Math.floor(remaining / 1000);

  if (stepsK > 99) return null;

  return {
    steps: stepsK * 1000,
    streak,
    missionLabel: String.fromCharCode(65 + missionNum),
  };
}
