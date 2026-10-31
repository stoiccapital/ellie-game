import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CATALOG, BANKRUPTCY_THRESHOLD, CAREER_TRACKS, DEFAULT_CAREER_TRACK_ID, HOME_TIERS, LIVING_EXPENSE, MAX_LTV, MORTGAGE_PAYMENT_FACTOR_MONTHLY, MORTGAGE_RATE_YEARLY, NEIGHBORS, RENT_MONTHLY, STARTING_CAPITAL, STARTING_DEBT, STARTING_HOME_TIER_ID, STARTING_HOME_VALUE } from './catalog';
import type { OwnedAsset, Speed } from './types';

interface GameState {
  month: number;
  capital: number;
  speed: Speed;
  owned: OwnedAsset[];
  homeValue: number;
  hasHome: boolean;
  homeTierId: string;
  gameOver: boolean;
  peakNetWorth: number;
  // Plot indices where the neighbor has already been bought out. These stay empty
  // after a sell (neighbor does not move back in).
  clearedPlots: number[];
  debt: number;
  jobLevel: number;
  // Month index at which the player entered the current level. Promotion requires
  // staying in-role for `tenureRequired` months before paying the training cost.
  jobLevelSinceMonth: number;
  careerTrackId: string;
  homeModalOpen: boolean;
  bankModalOpen: boolean;
  careerModalOpen: boolean;

  tick: () => void;
  setHomeModalOpen: (open: boolean) => void;
  setBankModalOpen: (open: boolean) => void;
  setCareerModalOpen: (open: boolean) => void;
  setSpeed: (s: Speed) => void;
  buyAsset: (defId: string, dollars?: number) => boolean;
  buyAssetBulk: (defId: string, qty: number) => number;
  buyNeighbor: (plotIndex: number) => boolean;
  sellAsset: (instanceId: string) => void;
  redevelopAsset: (instanceId: string, newDefId: string) => boolean;
  borrow: (amount: number) => boolean;
  repay: (amount: number) => boolean;
  sellHome: () => void;
  upgradeHome: (tierId: string) => boolean;
  upgradeJob: () => boolean;
  switchCareer: (trackId: string) => boolean;
  reset: () => void;
}

const monthlyRate = (yearly: number) => Math.pow(1 + yearly, 1 / 12) - 1;

// Merge a new, non-plot purchase into an existing holding of the same defId.
// ETFs are dollar-denominated: sum currentValue + purchasePrice.
// Businesses/vehicles are unit-based: weighted-average per-unit values, sum units.
// Returns the merged record OR null if nothing to merge with.
function mergeIntoHolding(
  owned: OwnedAsset[],
  defId: string,
  category: string,
  incoming: { currentValue: number; purchasePrice: number; units: number; purchasedMonth: number },
): { merged: OwnedAsset; original: OwnedAsset } | null {
  const existing = owned.find((a) => a.defId === defId && a.plotIndex === undefined);
  if (!existing) return null;
  if (category === 'etf') {
    return {
      original: existing,
      merged: {
        ...existing,
        currentValue: existing.currentValue + incoming.currentValue,
        purchasePrice: existing.purchasePrice + incoming.purchasePrice,
        purchasedMonth: Math.min(existing.purchasedMonth, incoming.purchasedMonth),
      },
    };
  }
  const oldU = existing.units ?? 1;
  const total = oldU + incoming.units;
  return {
    original: existing,
    merged: {
      ...existing,
      units: total,
      currentValue: (existing.currentValue * oldU + incoming.currentValue * incoming.units) / total,
      purchasePrice: (existing.purchasePrice * oldU + incoming.purchasePrice * incoming.units) / total,
      purchasedMonth: Math.min(existing.purchasedMonth, incoming.purchasedMonth),
    },
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
  month: 0,
  capital: STARTING_CAPITAL,
  speed: 0,
  owned: [],
  homeValue: STARTING_HOME_VALUE,
  hasHome: true,
  homeTierId: STARTING_HOME_TIER_ID,
  gameOver: false,
  peakNetWorth: STARTING_CAPITAL + STARTING_HOME_VALUE - STARTING_DEBT,
  clearedPlots: [],
  debt: STARTING_DEBT,
  jobLevel: 0,
  jobLevelSinceMonth: 0,
  careerTrackId: DEFAULT_CAREER_TRACK_ID,
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
      const units = asset.units ?? 1;
      // Dividend / cashflow — scaled by currentValue for ETFs so yield tracks holdings,
      // flat per-unit (× units) for everything else.
      if (def.category === 'etf') {
        const yieldPerDollar = def.monthlyIncome / def.price;
        capital += asset.currentValue * yieldPerDollar - def.monthlyExpense * units;
      } else {
        capital += (def.monthlyIncome - def.monthlyExpense) * units;
      }

      const appRate = def.appreciationYearly > 0 ? monthlyRate(def.appreciationYearly) : 0;
      const depRate = def.depreciationYearly > 0 ? monthlyRate(-def.depreciationYearly) : 0;
      // Monthly noise for volatile assets (ETFs). Zero-mean, uniform in [-vol, +vol].
      const noise = def.volatility ? (Math.random() * 2 - 1) * def.volatility : 0;
      const nextValue = asset.currentValue * (1 + appRate + depRate + noise);

      return { ...asset, currentValue: Math.max(0, nextValue) };
    });

    const track = CAREER_TRACKS.find((t) => t.id === s.careerTrackId) ?? CAREER_TRACKS[0];
    const salary = track.levels[Math.min(s.jobLevel, track.levels.length - 1)].salary;
    capital += salary - LIVING_EXPENSE;

    // Rent if Ellie has sold her home; otherwise upkeep the owned tier.
    const tier = HOME_TIERS.find((t) => t.id === s.homeTierId) ?? HOME_TIERS[1];
    if (!s.hasHome) {
      capital -= RENT_MONTHLY;
    } else {
      capital -= tier.monthlyExpense;
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
      ? s.homeValue * (1 + monthlyRate(tier.appreciationYearly))
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

    // Per-type ownership cap (e.g., 1 freelance studio since it's solo work).
    if (def.maxOwned !== undefined) {
      const ownedOfType = s.owned.reduce((n, a) => a.defId === defId ? n + (a.units ?? 1) : n, 0);
      if (ownedOfType >= def.maxOwned) return false;
    }

    // ETFs accept a dollar amount (fractional shares). Everything else is a fixed-price unit.
    const spend = def.category === 'etf' && dollars !== undefined ? dollars : def.price;
    if (spend <= 0) return false;
    if (s.capital < spend) return false;

    const incoming = {
      currentValue: spend,
      purchasePrice: spend,
      units: 1,
      purchasedMonth: s.month,
    };
    const merge = mergeIntoHolding(s.owned, defId, def.category, incoming);
    if (merge) {
      set({
        capital: s.capital - spend,
        owned: s.owned.map((a) => (a.instanceId === merge.original.instanceId ? merge.merged : a)),
      });
    } else {
      const newRecord: OwnedAsset = {
        instanceId: `${defId}_${s.month}_${Math.random().toString(36).slice(2, 7)}`,
        defId,
        purchasedMonth: s.month,
        purchasePrice: spend,
        currentValue: spend,
      };
      set({ capital: s.capital - spend, owned: [...s.owned, newRecord] });
    }
    return true;
  },

  buyAssetBulk: (defId, qty) => {
    const def = CATALOG.find((d) => d.id === defId);
    if (!def) return 0;
    // Plot-occupying categories must come via buyNeighbor / redevelop.
    if (def.category === 'real_estate' || def.category === 'tower' || def.category === 'commercial' || def.category === 'land') return 0;
    // ETFs are dollar-denominated; use buyAsset(defId, dollars) instead.
    if (def.category === 'etf') return 0;

    const s = get();
    let want = Math.max(0, Math.floor(qty));
    if (want <= 0) return 0;

    // Cap by affordability.
    want = Math.min(want, Math.floor(s.capital / def.price));

    // Vehicle parking cap: 1 base + 1 per owned plot.
    if (def.category === 'vehicle') {
      const plotTakers = s.owned.filter((a) => a.plotIndex !== undefined).length;
      const vehicles = s.owned.reduce((n, a) => {
        const d = CATALOG.find((c) => c.id === a.defId);
        return d?.category === 'vehicle' ? n + (a.units ?? 1) : n;
      }, 0);
      const parkingLeft = Math.max(0, 1 + plotTakers - vehicles);
      want = Math.min(want, parkingLeft);
    }

    // Per-type ownership cap.
    if (def.maxOwned !== undefined) {
      const ownedOfType = s.owned.reduce((n, a) => a.defId === defId ? n + (a.units ?? 1) : n, 0);
      const remaining = Math.max(0, def.maxOwned - ownedOfType);
      want = Math.min(want, remaining);
    }

    if (want <= 0) return 0;

    const spend = want * def.price;
    const incoming = {
      currentValue: def.price,
      purchasePrice: def.price,
      units: want,
      purchasedMonth: s.month,
    };
    const merge = mergeIntoHolding(s.owned, defId, def.category, incoming);
    if (merge) {
      set({
        capital: s.capital - spend,
        owned: s.owned.map((a) => (a.instanceId === merge.original.instanceId ? merge.merged : a)),
      });
    } else {
      const newRecord: OwnedAsset = {
        instanceId: `${defId}_${s.month}_${Math.random().toString(36).slice(2, 7)}`,
        defId,
        purchasedMonth: s.month,
        purchasePrice: def.price,
        currentValue: def.price,
        units: want,
      };
      set({ capital: s.capital - spend, owned: [...s.owned, newRecord] });
    }
    return want;
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
    const units = asset.units ?? 1;
    set({
      capital: s.capital + asset.currentValue * units,
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
    const track = CAREER_TRACKS.find((t) => t.id === s.careerTrackId) ?? CAREER_TRACKS[0];
    const next = s.jobLevel + 1;
    if (next >= track.levels.length) return false;
    const monthsAtLevel = s.month - s.jobLevelSinceMonth;
    if (monthsAtLevel < track.levels[next].tenureRequired) return false;
    const cost = track.levels[next].upgradeCost;
    if (s.capital < cost) return false;
    set({
      capital: s.capital - cost,
      jobLevel: next,
      jobLevelSinceMonth: s.month,
    });
    return true;
  },

  switchCareer: (trackId) => {
    const track = CAREER_TRACKS.find((t) => t.id === trackId);
    if (!track) return false;
    const s = get();
    if (s.careerTrackId === trackId) return false;
    // Switching careers resets you to the entry level at the new corporation
    // and restarts the tenure clock.
    set({ careerTrackId: trackId, jobLevel: 0, jobLevelSinceMonth: s.month });
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

  upgradeHome: (tierId) => {
    const s = get();
    const target = HOME_TIERS.find((t) => t.id === tierId);
    if (!target) return false;
    if (s.hasHome && s.homeTierId === tierId) return false;

    // Sell the current place at market, mortgage paid off from proceeds.
    const sellPayoff = s.hasHome ? Math.min(s.debt, s.homeValue) : 0;
    const sellProceeds = s.hasHome ? s.homeValue - sellPayoff : 0;

    // Net cash movement: receive proceeds, pay the new tier's list price.
    const net = sellProceeds - target.price;
    if (s.capital + net < BANKRUPTCY_THRESHOLD) return false;

    set({
      capital: s.capital + net,
      debt: s.debt - sellPayoff,
      homeValue: target.price,
      hasHome: true,
      homeTierId: tierId,
    });
    return true;
  },

  reset: () =>
    set({
      month: 0,
      capital: STARTING_CAPITAL,
      speed: 0,
      owned: [],
      homeValue: STARTING_HOME_VALUE,
      hasHome: true,
      homeTierId: STARTING_HOME_TIER_ID,
      gameOver: false,
      peakNetWorth: STARTING_CAPITAL + STARTING_HOME_VALUE - STARTING_DEBT,
      clearedPlots: [],
      debt: STARTING_DEBT,
      jobLevel: 0,
      jobLevelSinceMonth: 0,
      careerTrackId: DEFAULT_CAREER_TRACK_ID,
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
        homeTierId: s.homeTierId,
        gameOver: s.gameOver,
        peakNetWorth: s.peakNetWorth,
        clearedPlots: s.clearedPlots,
        debt: s.debt,
        jobLevel: s.jobLevel,
        jobLevelSinceMonth: s.jobLevelSinceMonth,
        careerTrackId: s.careerTrackId,
      }),
    },
  ),
);
