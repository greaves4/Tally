const DEBT_CAP_DAYS = 7;
const CREDIT_CAP_DAYS = 3;

export const DEFAULT_DAILY_GOAL = 8000;

/**
 * Calcula el nuevo balance acumulado después de un día.
 *
 * - Positivo = crédito (se caminó de más)
 * - Negativo = deuda (se caminó de menos)
 *
 * Caps: deuda máxima = 7 días de meta; crédito máximo = 3 días.
 */
export function updateBalance(
  stepsToday: number,
  dailyGoal: number,
  prevBalance: number,
): number {
  const raw = prevBalance + (stepsToday - dailyGoal);
  return Math.max(-dailyGoal * DEBT_CAP_DAYS, Math.min(dailyGoal * CREDIT_CAP_DAYS, raw));
}

/**
 * Meta efectiva del día teniendo en cuenta el balance acumulado.
 * Con crédito la meta baja; con deuda sube. Nunca por debajo de 0.
 */
export function effectiveGoal(dailyGoal: number, balance: number): number {
  return Math.max(0, dailyGoal - balance);
}

export type BalanceKind = 'credit' | 'even' | 'debt';

export interface BalanceStatus {
  kind: BalanceKind;
  label: string;
}

export function balanceStatus(balance: number): BalanceStatus {
  if (balance > 0) {
    return {
      kind: 'credit',
      label: `+${balance.toLocaleString('es-AR')} pasos de crédito`,
    };
  }
  if (balance < 0) {
    return {
      kind: 'debt',
      label: `${Math.abs(balance).toLocaleString('es-AR')} pasos de deuda`,
    };
  }
  return { kind: 'even', label: 'Al día' };
}
