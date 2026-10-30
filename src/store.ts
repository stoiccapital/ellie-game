import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CATALOG, BANKRUPTCY_THRESHOLD, HOME_APPRECIATION_YEARLY, JOB_LEVELS, LIVING_EXPENSE, MAX_LTV, MORTGAGE_PAYMENT_FACTOR_MONTHLY, MORTGAGE_RATE_YEARLY, NEIGHBORS, RENT_MONTHLY, STARTING_CAPITAL, STARTING_DEBT, STARTING_HOME_VALUE } from './catalog';
import type { OwnedAsset, Speed } from './types';

interface GameState {
  month: number;
  capital: number;
  speed: Speed;
  owned: OwnedAsset[];
  homeValue: number;
  hasHome: boolean;
  gameOver: boolean;
  peakNetWorth: number;
  // Plot indices where the neighbor has already been bought out. These stay empty
  // after a sell (neighbor does not move back in).
  clearedPlots: number[];
  debt: number;
  jobLevel: number;
  homeModalOpen: boolean;
  bankModalOpen: boolean;
  careerModalOpen: boolean;

  tick: () => void;
  setHomeModalOpen: (open: boolean) => void;
  setBankModalOpen: (open: boolean) => void;
  setCareerModalOpen: (open: boolean) => void;
  setSpeed: (s: Speed) => void;
  buyAsset: (defId: string, dollars?: number) => boolean;
  buyNeighbor: (plotIndex: number) => boolean;
  sellAsset: (instanceId: string) => void;
  redevelopAsset: (instanceId: string, newDefId: string) => boolean;
  borrow: (amount: number) => boolean;
  repay: (amount: number) => boolean;
  sellHome: () => void;
  upgradeJob: () => boolean;
  reset: () => void;
}

const monthlyRate = (yearly: number) => Math.pow(1 + yearly, 1 / 12) - 1;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
  month: 0,
  capital: STARTING_CAPITAL,
  speed: 0,
  owned: [],
  homeValue: STARTING_HOME_VALUE,
  hasHome: true,
  gameOver: false,
  peakNetWorth: STARTING_CAPITAL + STARTING_HOME_VALUE - STARTING_DEBT,
  clearedPlots: [],
  debt: STARTING_DEBT,
  jobLevel: 0,
  homeModalOpen: false,
  bankModalOpen: false,
  careerModalOpen: false,

  setHomeModalOpen: (open) => set({ homeModalOpen: open }),
  setBankModalOpen: (open) => set({ bankModalOpen: open }),
  setCareerModalOpen: (open) => set({ careerModalOpen: open }),

  tick: () => {
    const s = get();
    if (s.gameOver) return;

    let capital = s.capital;
    const newOwned: OwnedAsset[] = s.owned.map((asset) => {
      const def = CATALOG.find((d) => d.id === asset.defId)!;
      // Dividend / cashflow — scaled by currentValue for ETFs so yield tracks holdings,
      // flat per-unit for everything else.
      if (def.category === 'etf') {
        const yieldPerDollar = def.monthlyIncome / def.price;
        capital += asset.currentValue * yieldPerDollar - def.monthlyExpense;
      } else {
        capital += def.monthlyIncome - def.monthlyExpense;
      }

      const appRate = def.appreciationYearly > 0 ? monthlyRate(def.appreciationYearly) : 0;
      const depRate = def.depreciationYearly > 0 ? monthlyRate(-def.depreciationYearly) : 0;
      // Monthly noise for volatile assets (ETFs). Zero-mean, uniform in [-vol, +vol].
      const noise = def.volatility ? (Math.random() * 2 - 1) * def.volatility : 0;
      const nextValue = asset.currentValue * (1 + appRate + depRate + noise);

      return { ...asset, currentValue: Math.max(0, nextValue) };
    });

    const salary = JOB_LEVELS[Math.min(s.jobLevel, JOB_LEVELS.length - 1)].salary;
    capital += salary - LIVING_EXPENSE;

    // Rent if Ellie has sold her home.
    if (!s.hasHome) {
      capital -= RENT_MONTHLY;
    }

    // Amortizing mortgage: fixed monthly payment covers interest + principal.
    // Principal portion is paid down each month, so debt declines over time.
    let debt = s.debt;
    if (debt > 0) {
      const interest = debt * monthlyRate(MORTGAGE_RATE_YEARLY);
      const payment = Math.min(debt + interest, debt * MORTGAGE_PAYMENT_FACTOR_MONTHLY);
      capital -= payment;
      debt = Math.max(0, debt - (payment - interest));
    }

    const homeValue = s.hasHome
      ? s.homeValue * (1 + monthlyRate(HOME_APPRECIATION_YEARLY))
      : 0;

    const assetValue = newOwned.reduce((a, b) => a + b.currentValue, 0);
    const netWorth = capital + homeValue + assetValue - debt;
    const peakNetWorth = Math.max(s.peakNetWorth, netWorth);

    const bankrupt = capital < BANKRUPTCY_THRESHOLD;

    set({
      capital,
      owned: newOwned,
      homeValue,
      debt,
      month: s.month + 1,
      gameOver: bankrupt,
      speed: bankrupt ? 0 : s.speed,
      peakNetWorth,
    });
  },

  setSpeed: (speed) => set({ speed }),

  buyAsset: (defId, dollars) => {
    const def = CATALOG.find((d) => d.id === defId);
    if (!def) return false;
    // Plot-occupying categories must come via buyNeighbor / redevelop.
    if (def.category === 'real_estate' || def.category === 'tower' || def.category === 'commercial' || def.category === 'land') {
      return false;
    }
    const s = get();
    // Vehicle parking cap: 1 base + 1 per owned plot. Does not apply to ETFs/businesses.
    if (def.category === 'vehicle') {
      const plotTakers = s.owned.filter((a) => a.plotIndex !== undefined).length;
      const vehicles = s.owned.filter((a) => {
        const d = CATALOG.find((c) => c.id === a.defId);
        return d?.category === 'vehicle';
      }).length;
      if (vehicles >= 1 + plotTakers) return false;
    }

    // ETFs accept a dollar amount (fractional shares). Everything else is a fixed-price unit.
    const spend = def.category === 'etf' && dollars !== undefined ? dollars : def.price;
    if (spend <= 0) return false;
    if (s.capital < spend) return false;

    const owned: OwnedAsset = {
      instanceId: `${defId}_${s.month}_${Math.random().toString(36).slice(2, 7)}`,
      defId,
      purchasedMonth: s.month,
      purchasePrice: spend,
      currentValue: spend,
    };
    set({ capital: s.capital - spend, owned: [...s.owned, owned] });
    return true;
  },

  buyNeighbor: (plotIndex) => {
    const neighbor = NEIGHBORS[plotIndex];
    if (!neighbor) return false;
    const s = get();
    if (s.owned.some((a) => a.plotIndex === plotIndex)) return false;
    const def = CATALOG.find((d) => d.id === neighbor.defId);
    if (!def) return false;
    if (s.capital < def.price) return false;

    const owned: OwnedAsset = {
      instanceId: `${neighbor.defId}_${s.month}_${Math.random().toString(36).slice(2, 7)}`,
      defId: neighbor.defId,
      purchasedMonth: s.month,
      purchasePrice: def.price,
      currentValue: def.price,
      plotIndex,
    };
    set({
      capital: s.capital - def.price,
      owned: [...s.owned, owned],
      clearedPlots: s.clearedPlots.includes(plotIndex)
        ? s.clearedPlots
        : [...s.clearedPlots, plotIndex],
    });
    return true;
  },

  sellAsset: (instanceId) => {
    const s = get();
    const asset = s.owned.find((a) => a.instanceId === instanceId);
    if (!asset) return;
    set({
      capital: s.capital + asset.currentValue,
      owned: s.owned.filter((a) => a.instanceId !== instanceId),
    });
  },

  redevelopAsset: (instanceId, newDefId) => {
    const s = get();
    const asset = s.owned.find((a) => a.instanceId === instanceId);
    if (!asset) return false;
    if (asset.plotIndex === undefined) return false; // only plot-owning assets can be redeveloped
    const newDef = CATALOG.find((d) => d.id === newDefId);
    if (!newDef) return false;
    if (s.capital < newDef.price) return false;
    set({
      capital: s.capital - newDef.price,
      owned: s.owned.map((a) =>
        a.instanceId === instanceId
          ? {
              ...a,
              defId: newDefId,
              purchasePrice: newDef.price,
              currentValue: newDef.price,
              purchasedMonth: s.month,
            }
          : a,
      ),
    });
    return true;
  },

  borrow: (amount) => {
    if (amount <= 0) return false;
    const s = get();
    const assetValue = s.owned.reduce((a, b) => a + b.currentValue, 0);
    const collateral = s.homeValue + assetValue;
    const creditLimit = collateral * MAX_LTV;
    if (s.debt + amount > creditLimit) return false;
    set({ capital: s.capital + amount, debt: s.debt + amount });
    return true;
  },

  repay: (amount) => {
    if (amount <= 0) return false;
    const s = get();
    const pay = Math.min(amount, s.debt, Math.max(0, s.capital));
    if (pay <= 0) return false;
    set({ capital: s.capital - pay, debt: s.debt - pay });
    return true;
  },

  upgradeJob: () => {
    const s = get();
    const next = s.jobLevel + 1;
    if (next >= JOB_LEVELS.length) return false;
    const cost = JOB_LEVELS[next].upgradeCost;
    if (s.capital < cost) return false;
    set({ capital: s.capital - cost, jobLevel: next });
    return true;
  },

  sellHome: () => {
    const s = get();
    if (!s.hasHome) return;
    // Closing: mortgage/collateral debt is paid off from sale proceeds first.
    const payoff = Math.min(s.debt, s.homeValue);
    set({
      capital: s.capital + s.homeValue - payoff,
      debt: s.debt - payoff,
      homeValue: 0,
      hasHome: false,
    });
  },

  reset: () =>
    set({
      month: 0,
      capital: STARTING_CAPITAL,
      speed: 0,
      owned: [],
      homeValue: STARTING_HOME_VALUE,
      hasHome: true,
      gameOver: false,
      peakNetWorth: STARTING_CAPITAL + STARTING_HOME_VALUE - STARTING_DEBT,
      clearedPlots: [],
      debt: STARTING_DEBT,
      jobLevel: 0,
    }),
    }),
    {
      name: 'ellie-money-house:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist only durable game state. Keep UI modal flags and current speed ephemeral.
      partialize: (s) => ({
        month: s.month,
        capital: s.capital,
        owned: s.owned,
        homeValue: s.homeValue,
        hasHome: s.hasHome,
        gameOver: s.gameOver,
        peakNetWorth: s.peakNetWorth,
        clearedPlots: s.clearedPlots,
        debt: s.debt,
        jobLevel: s.jobLevel,
      }),
    },
  ),
);
