export type AssetCategory = 'real_estate' | 'land' | 'vehicle' | 'commercial' | 'tower' | 'etf' | 'business';

export interface AssetDef {
  id: string;
  name: string;
  category: AssetCategory;
  price: number;
  monthlyIncome: number;
  monthlyExpense: number;
  appreciationYearly: number;
  depreciationYearly: number;
  description: string;
  color: string;
  // Only used when category === 'tower'; number of floors drives sprite height and label.
  floors?: number;
  // Optional explicit sprite variant. Overrides the category-based sprite in AssetSprite.
  // Supported values: 'shop' | 'supermarket' | 'office' | 'hotel' | 'school' | 'clinic'
  //                 | 'hospital' | 'gym' | 'cinema'.
  sprite?: string;
  // Monthly price volatility (fraction, e.g., 0.04 = ±4% noise). Only used for ETFs.
  volatility?: number;
}

export interface OwnedAsset {
  instanceId: string;
  defId: string;
  purchasedMonth: number;
  purchasePrice: number;
  currentValue: number;
  // Plot index (0..14) for land-occupying assets; undefined for vehicles.
  plotIndex?: number;
}

export type Speed = 0 | 1 | 10;
