import { create } from 'zustand';

import { getStepDebt } from '@/lib/db';

type DebtStoreState = {
  balance: number;
  isLoaded: boolean;
  loadBalance: () => Promise<void>;
  setBalance: (balance: number) => void;
};

export const useDebtStore = create<DebtStoreState>()((set) => ({
  balance: 0,
  isLoaded: false,

  loadBalance: async () => {
    try {
      const record = await getStepDebt();
      set({ balance: record?.balance ?? 0, isLoaded: true });
    } catch (e) {
      console.warn('[debtStore] loadBalance failed:', e);
      set({ isLoaded: true });
    }
  },

  setBalance: (balance: number) => set({ balance }),
}));
