import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getStepDebt } from '@/lib/db';
import {
  DEFAULT_DAILY_GOAL,
  balanceStatus,
  effectiveGoal,
  type BalanceKind,
} from '@/lib/stepDebt';

const DAILY_GOAL = DEFAULT_DAILY_GOAL;

export type UseStepDebtResult = {
  balance: number;
  status: BalanceKind;
  label: string;
  effectiveGoalToday: number;
};

export function useStepDebt(): UseStepDebtResult {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load(): Promise<void> {
      try {
        const record = await getStepDebt();
        if (isMounted && record !== null) {
          setBalance(record.balance);
        }
      } catch (e) {
        console.warn('[useStepDebt] load failed:', e);
      }
    }

    void load();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void load();
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const { kind, label } = balanceStatus(balance);

  return {
    balance,
    status: kind,
    label,
    effectiveGoalToday: effectiveGoal(DAILY_GOAL, balance),
  };
}
