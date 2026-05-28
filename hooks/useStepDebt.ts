import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  DEFAULT_DAILY_GOAL,
  updateBalance,
  balanceStatus,
  effectiveGoal,
  type BalanceKind,
} from '@/lib/stepDebt';
import { useDebtStore } from '@/stores/debtStore';

const DAILY_GOAL = DEFAULT_DAILY_GOAL;

export type UseStepDebtResult = {
  balance: number;
  status: BalanceKind;
  label: string;
  effectiveGoalToday: number;
};

export function useStepDebt(stepsToday: number): UseStepDebtResult {
  const storedBalance = useDebtStore((s) => s.balance);
  const loadBalance = useDebtStore((s) => s.loadBalance);

  useEffect(() => {
    void loadBalance();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void loadBalance();
    });

    return () => { sub.remove(); };
  }, [loadBalance]);

  const projected = updateBalance(stepsToday, DAILY_GOAL, storedBalance);
  console.log('[StepDebt] stored:', storedBalance, 'projected:', projected, 'steps:', stepsToday);

  // Si el usuario aún no caminó nada hoy, no tiene sentido mostrar deuda
  // proyectada: solo exponemos crédito acumulado (si lo hay) o "Al día".
  const displayBalance = stepsToday === 0 ? Math.max(storedBalance, 0) : projected;
  const { kind, label } = balanceStatus(displayBalance);

  return {
    balance: displayBalance,
    status: kind,
    label,
    effectiveGoalToday: effectiveGoal(DAILY_GOAL, displayBalance),
  };
}
