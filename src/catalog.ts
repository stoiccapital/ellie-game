import type { AssetDef } from './types';
import { MAX_PLOTS } from './lib/city';

export const CATALOG: AssetDef[] = [
  {
    id: 'studio_condo',
    name: 'Studio Condo',
    category: 'real_estate',
    price: 80_000,
    monthlyIncome: 550,
    monthlyExpense: 220,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'Small city rental. Steady entry-level cashflow.',
    color: '#9bb3d9',
  },
  {
    id: 'single_family',
    name: 'Single-Family Rental',
    category: 'real_estate',
    price: 220_000,
    monthlyIncome: 1_400,
    monthlyExpense: 560,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: '3-bed suburban rental home.',
    color: '#c9a97a',
  },
  {
    id: 'duplex',
    name: 'Duplex',
    category: 'real_estate',
    price: 380_000,
    monthlyIncome: 2_600,
    monthlyExpense: 1_040,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Two units, one roof. Diversified tenants.',
    color: '#b48ac1',
  },
  {
    id: 'apartment_4u',
    name: '4-Unit Apartment',
    category: 'real_estate',
    price: 560_000,
    monthlyIncome: 4_000,
    monthlyExpense: 1_600,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Small multi-family building.',
    color: '#7fa8c7',
  },
  {
    id: 'commercial_lot',
    name: 'Commercial Lot',
    category: 'commercial',
    price: 850_000,
    monthlyIncome: 8_200,
    monthlyExpense: 1_600,
    appreciationYearly: 0.05,
    depreciationYearly: 0,
    description: 'Retail-leased commercial property.',
    color: '#d9b672',
  },
  {
    id: 'warehouse',
    name: 'Industrial Warehouse',
    category: 'commercial',
    price: 1_500_000,
    monthlyIncome: 14_500,
    monthlyExpense: 2_200,
    appreciationYearly: 0.045,
    depreciationYearly: 0,
    description: 'Long-lease logistics tenant.',
    color: '#9c9992',
  },
  {
    id: 'vacant_land',
    name: 'Vacant Land Plot',
    category: 'land',
    price: 50_000,
    monthlyIncome: 0,
    monthlyExpense: 40,
    appreciationYearly: 0.07,
    depreciationYearly: 0,
    description: 'No cashflow. High appreciation.',
    color: '#6b9a6e',
  },
  {
    id: 'premium_land',
    name: 'Premium Parcel',
    category: 'land',
    price: 280_000,
    monthlyIncome: 0,
    monthlyExpense: 120,
    appreciationYearly: 0.085,
    depreciationYearly: 0,
    description: 'Development-ready. Prime location.',
    color: '#4e8a56',
  },
  {
    id: 'apt_10',
    name: 'Mid-Rise Apartment · 10 fl',
    category: 'tower',
    price: 1_800_000,
    monthlyIncome: 15_000,
    monthlyExpense: 6_500,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Compact 10-floor apartment block.',
    color: '#5a7a9c',
    floors: 10,
  },
  {
    id: 'apt_20',
    name: 'High-Rise Apartment · 20 fl',
    category: 'tower',
    price: 5_200_000,
    monthlyIncome: 42_000,
    monthlyExpense: 18_000,
    appreciationYearly: 0.04,
    depreciationYearly: 0,
    description: '20-floor apartment tower in a prime location.',
    color: '#6a5f8a',
    floors: 20,
  },
  {
    id: 'apt_30',
    name: 'Skyscraper · 30 fl',
    category: 'tower',
    price: 14_000_000,
    monthlyIncome: 115_000,
    monthlyExpense: 50_000,
    appreciationYearly: 0.04,
    depreciationYearly: 0,
    description: '30-floor luxury residential tower.',
    color: '#4a6a7d',
    floors: 30,
  },
  {
    id: 'apt_40',
    name: 'Landmark Tower · 40 fl',
    category: 'tower',
    price: 32_000_000,
    monthlyIncome: 255_000,
    monthlyExpense: 110_000,
    appreciationYearly: 0.045,
    depreciationYearly: 0,
    description: '40-floor landmark skyscraper. Prestige asset.',
    color: '#3f5a66',
    floors: 40,
  },
  // Food & beverage
  {
    id: 'cafe',
    name: 'Café',
    category: 'commercial',
    price: 280_000,
    monthlyIncome: 4_800,
    monthlyExpense: 3_000,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'Neighborhood coffee bar. Steady morning traffic.',
    color: '#c88a4a',
    sprite: 'shop',
  },
  {
    id: 'bar',
    name: 'Bar / Pub',
    category: 'commercial',
    price: 420_000,
    monthlyIncome: 7_000,
    monthlyExpense: 3_800,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'Evening drinks spot. Higher margin, late hours.',
    color: '#8d4a4a',
    sprite: 'shop',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    category: 'commercial',
    price: 650_000,
    monthlyIncome: 11_000,
    monthlyExpense: 5_500,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Casual dining. Lunch + dinner service.',
    color: '#b55a3c',
    sprite: 'shop',
  },
  // Retail
  {
    id: 'convenience',
    name: 'Convenience Store',
    category: 'commercial',
    price: 340_000,
    monthlyIncome: 5_200,
    monthlyExpense: 2_800,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: '24/7 corner store. Low margin, high turnover.',
    color: '#4e8a7e',
    sprite: 'shop',
  },
  {
    id: 'boutique',
    name: 'Boutique Shop',
    category: 'commercial',
    price: 380_000,
    monthlyIncome: 4_600,
    monthlyExpense: 2_500,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'Specialty retail. Lower volume, better margins.',
    color: '#8a5c87',
    sprite: 'shop',
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    category: 'commercial',
    price: 1_800_000,
    monthlyIncome: 28_000,
    monthlyExpense: 14_000,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Full-size grocery store with anchor tenant.',
    color: '#5a8a52',
    sprite: 'supermarket',
  },
  // Office & hospitality
  {
    id: 'small_office',
    name: 'Small Office Building',
    category: 'commercial',
    price: 920_000,
    monthlyIncome: 11_500,
    monthlyExpense: 5_000,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Three floors of professional office space.',
    color: '#5a6f8a',
    sprite: 'office',
  },
  {
    id: 'office_10',
    name: 'Mid-Rise Office · 10 fl',
    category: 'tower',
    price: 4_800_000,
    monthlyIncome: 38_000,
    monthlyExpense: 14_000,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: '10-floor office tower. Anchor commercial tenants.',
    color: '#4a607a',
    floors: 10,
  },
  {
    id: 'hotel_boutique',
    name: 'Boutique Hotel',
    category: 'commercial',
    price: 4_500_000,
    monthlyIncome: 56_000,
    monthlyExpense: 24_000,
    appreciationYearly: 0.04,
    depreciationYearly: 0,
    description: 'Mid-size hotel. Occupancy-driven revenue.',
    color: '#b89668',
    sprite: 'hotel',
  },
  // Education
  {
    id: 'daycare',
    name: 'Daycare',
    category: 'commercial',
    price: 500_000,
    monthlyIncome: 5_000,
    monthlyExpense: 2_000,
    appreciationYearly: 0.025,
    depreciationYearly: 0,
    description: 'Early-years childcare. Steady but regulated.',
    color: '#d9ba55',
    sprite: 'school',
  },
  {
    id: 'school',
    name: 'Elementary School',
    category: 'commercial',
    price: 3_200_000,
    monthlyIncome: 30_000,
    monthlyExpense: 12_000,
    appreciationYearly: 0.02,
    depreciationYearly: 0,
    description: 'K–6 school. Civic anchor; lower growth.',
    color: '#c9a84a',
    sprite: 'school',
  },
  // Healthcare
  {
    id: 'clinic',
    name: 'Medical Clinic',
    category: 'commercial',
    price: 720_000,
    monthlyIncome: 9_000,
    monthlyExpense: 3_600,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'General-practice clinic with a few doctors.',
    color: '#8ab5c5',
    sprite: 'clinic',
  },
  {
    id: 'hospital',
    name: 'Hospital',
    category: 'commercial',
    price: 9_000_000,
    monthlyIncome: 110_000,
    monthlyExpense: 42_000,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Full-service hospital. Large campus asset.',
    color: '#a3c0ce',
    sprite: 'hospital',
  },
  // Fitness & entertainment
  {
    id: 'gym',
    name: 'Gym',
    category: 'commercial',
    price: 450_000,
    monthlyIncome: 5_800,
    monthlyExpense: 3_000,
    appreciationYearly: 0.03,
    depreciationYearly: 0,
    description: 'Membership gym. Low variable cost.',
    color: '#b84a5a',
    sprite: 'gym',
  },
  {
    id: 'cinema',
    name: 'Cinema',
    category: 'commercial',
    price: 2_100_000,
    monthlyIncome: 24_000,
    monthlyExpense: 9_500,
    appreciationYearly: 0.035,
    depreciationYearly: 0,
    description: 'Multi-screen movie theater. Weekend-driven.',
    color: '#6a4a8a',
    sprite: 'cinema',
  },
  {
    id: 'economy_car',
    name: 'Economy Rental Car',
    category: 'vehicle',
    price: 25_000,
    monthlyIncome: 820,
    monthlyExpense: 280,
    appreciationYearly: 0,
    depreciationYearly: 0.15,
    description: 'High yield. Fast depreciation.',
    color: '#e07070',
  },
  {
    id: 'van',
    name: 'Delivery Van',
    category: 'vehicle',
    price: 48_000,
    monthlyIncome: 1_450,
    monthlyExpense: 450,
    appreciationYearly: 0,
    depreciationYearly: 0.12,
    description: 'Leased to delivery contractors.',
    color: '#7cb59e',
  },
  {
    id: 'suv_fleet',
    name: 'SUV Fleet (3)',
    category: 'vehicle',
    price: 155_000,
    monthlyIncome: 4_200,
    monthlyExpense: 1_100,
    appreciationYearly: 0,
    depreciationYearly: 0.12,
    description: 'Rideshare / rental fleet.',
    color: '#4a6fa5',
  },
  // ──────────────────────────────────────────────────────────────────────────
  // ETFs — passive portfolio holdings. Price drifts with trend + volatility.
  // appreciationYearly captures long-term expected return; volatility is monthly noise.
  // monthlyIncome encodes dividend yield at purchase price (treated as scalar for simplicity).
  {
    id: 'etf_bond',
    name: 'Bond Index ETF',
    category: 'etf',
    price: 1_000,
    monthlyIncome: 3,
    monthlyExpense: 0,
    appreciationYearly: 0.015,
    depreciationYearly: 0,
    volatility: 0.008,
    description: 'Investment-grade bonds. Low volatility, modest yield.',
    color: '#6b8aa3',
  },
  {
    id: 'etf_sp500',
    name: 'S&P 500 ETF',
    category: 'etf',
    price: 1_000,
    monthlyIncome: 1.5,
    monthlyExpense: 0,
    appreciationYearly: 0.08,
    depreciationYearly: 0,
    volatility: 0.04,
    description: 'Large-cap US equities. Core diversified holding.',
    color: '#4e8a7e',
  },
  {
    id: 'etf_world',
    name: 'MSCI World ETF',
    category: 'etf',
    price: 1_000,
    monthlyIncome: 1.5,
    monthlyExpense: 0,
    appreciationYearly: 0.07,
    depreciationYearly: 0,
    volatility: 0.035,
    description: 'Global developed-market equities.',
    color: '#5a7a9c',
  },
  {
    id: 'etf_tech',
    name: 'Tech Sector ETF',
    category: 'etf',
    price: 1_000,
    monthlyIncome: 0.8,
    monthlyExpense: 0,
    appreciationYearly: 0.11,
    depreciationYearly: 0,
    volatility: 0.065,
    description: 'Concentrated tech bet. Higher upside, higher drawdowns.',
    color: '#8a5c87',
  },
  {
    id: 'etf_emerging',
    name: 'Emerging Markets ETF',
    category: 'etf',
    price: 1_000,
    monthlyIncome: 2.0,
    monthlyExpense: 0,
    appreciationYearly: 0.09,
    depreciationYearly: 0,
    volatility: 0.055,
    description: 'Emerging-market equities. Volatile but higher growth.',
    color: '#c88a4a',
  },
  // ──────────────────────────────────────────────────────────────────────────
  // Businesses — owner-operated, no plot required. Pay to start, earn monthly.
  // Returns target realistic owner-passive ROI (~15-20% annual) after paying operators.
  // Owner-operated solo businesses stay low since the main input is the owner's time.
  {
    id: 'biz_freelance',
    name: 'Freelance Studio',
    category: 'business',
    price: 15_000,
    monthlyIncome: 450,
    monthlyExpense: 150,
    appreciationYearly: 0,
    depreciationYearly: 0.05,
    description: 'Solo consulting. Modest side income. Scales with your time.',
    color: '#d9b672',
    maxOwned: 1,
  },
  {
    id: 'biz_online_shop',
    name: 'E-commerce Shop',
    category: 'business',
    price: 25_000,
    monthlyIncome: 950,
    monthlyExpense: 550,
    appreciationYearly: 0,
    depreciationYearly: 0.04,
    description: 'Dropship / small online brand. Scales with ads.',
    color: '#8ab5c5',
    maxOwned: 3,
  },
  {
    id: 'biz_food_truck',
    name: 'Food Truck',
    category: 'business',
    price: 48_000,
    monthlyIncome: 1_800,
    monthlyExpense: 1_200,
    appreciationYearly: 0,
    depreciationYearly: 0.06,
    description: 'Mobile kitchen. Lunchtime crowds, weekend events.',
    color: '#c88a4a',
    maxOwned: 8,
  },
  {
    id: 'biz_delivery',
    name: 'Delivery Service',
    category: 'business',
    price: 120_000,
    monthlyIncome: 3_600,
    monthlyExpense: 2_100,
    appreciationYearly: 0,
    depreciationYearly: 0.07,
    description: 'Last-mile courier operation with a small fleet.',
    color: '#7fa8c7',
    maxOwned: 5,
  },
  {
    id: 'biz_agency',
    name: 'Marketing Agency',
    category: 'business',
    price: 220_000,
    monthlyIncome: 6_800,
    monthlyExpense: 4_100,
    appreciationYearly: 0,
    depreciationYearly: 0.03,
    description: 'Boutique agency. People-heavy but strong margins.',
    color: '#b48ac1',
    maxOwned: 3,
  },
  {
    id: 'biz_saas',
    name: 'SaaS Product',
    category: 'business',
    price: 450_000,
    monthlyIncome: 12_500,
    monthlyExpense: 6_500,
    appreciationYearly: 0.02,
    depreciationYearly: 0,
    description: 'Vertical SaaS with recurring revenue. Portfolio can scale indefinitely.',
    color: '#5a8a52',
    // No cap — a SaaS portfolio operator / holdco can accumulate thousands.
  },
];

export interface Neighbor {
  name: string;
  defId: string;
}

// Deterministic neighbor list — one per plot across every block on the street.
// Names cycle through a pool; house types cycle through the catalog so each block has variety.
const NEIGHBOR_NAMES = [
  'Oliver', 'Mia', 'Noah', 'Ava', 'Leo', 'Sofia', 'Lukas', 'Emma',
  'Jonas', 'Hanna', 'Milan', 'Clara', 'Theo', 'Nora', 'Finn', 'Luna',
  'Max', 'Anna', 'Felix', 'Paula', 'Ben', 'Lea', 'Jan', 'Lara',
  'Tim', 'Zoe', 'Erik', 'Nina', 'Sven', 'Lia', 'Jonah', 'Maya',
  'Henri', 'Elli', 'Pierre', 'Maja', 'Sam', 'Rose', 'Kai', 'Juno',
  'Will', 'Elsa', 'Ted', 'Isla', 'Hugo', 'Thea', 'Cole', 'Vera',
  'Sean', 'Edda', 'Nils', 'Flora', 'Jon', 'Mira', 'Ash', 'Alma',
  'Gus', 'Freya', 'Milo', 'Imogen', 'Rune', 'Signe', 'Ulf',
];
const HOUSE_DEF_ROTATION = [
  'studio_condo', 'single_family', 'duplex', 'single_family',
  'studio_condo', 'apartment_4u', 'commercial_lot', 'duplex',
  'warehouse', 'single_family', 'premium_land', 'studio_condo',
  'vacant_land', 'apartment_4u', 'duplex', 'single_family',
];

function makeNeighbors(count: number): Neighbor[] {
  return Array.from({ length: count }, (_, i) => ({
    name: NEIGHBOR_NAMES[i % NEIGHBOR_NAMES.length],
    defId: HOUSE_DEF_ROTATION[i % HOUSE_DEF_ROTATION.length],
  }));
}

export const NEIGHBORS: Neighbor[] = makeNeighbors(MAX_PLOTS);

// Buildings the player can construct via "Redevelop" on an owned plot.
// Grouped and ordered roughly by price band so the modal reads cheapest → priciest.
export const BUILDABLE_IDS = [
  // Residential
  'single_family',
  'duplex',
  'apartment_4u',
  'apt_10',
  'apt_20',
  'apt_30',
  'apt_40',
  // Food & beverage
  'cafe',
  'bar',
  'restaurant',
  // Retail
  'convenience',
  'boutique',
  'supermarket',
  // Office & hospitality
  'small_office',
  'office_10',
  'hotel_boutique',
  // Education
  'daycare',
  'school',
  // Healthcare
  'clinic',
  'hospital',
  // Fitness & entertainment
  'gym',
  'cinema',
];

export const LIVING_EXPENSE = 1_800;
// Legacy constant kept for the HUD "Salary" label — JOB_LEVELS[0].salary.
export const JOB_SALARY = 3_500;

// Career ladder. Each track is a corporate ladder at a named corporation.
// Pay the training cost AND serve the tenure to level up to a higher salary.
export interface JobLevel {
  title: string;
  salary: number;
  upgradeCost: number;
  // Months the player must have spent in the previous level before this one unlocks.
  // Ignored on the entry level (index 0).
  tenureRequired: number;
}
export interface CareerTrack {
  id: string;
  name: string;
  company: string;
  tagline: string;
  color: string;
  levels: JobLevel[];
}
export const CAREER_TRACKS: CareerTrack[] = [
  {
    id: 'finance',
    name: 'Finance',
    company: 'Goldstone Capital',
    tagline: 'Investment banking. Grueling hours, highest ceiling.',
    color: '#5a8a9c',
    levels: [
      { title: 'Analyst',           salary:  5_000, upgradeCost:      0, tenureRequired:  0 },
      { title: 'Associate',         salary:  8_500, upgradeCost: 12_000, tenureRequired: 12 },
      { title: 'Vice President',    salary: 14_000, upgradeCost: 35_000, tenureRequired: 24 },
      { title: 'Director',          salary: 24_000, upgradeCost: 100_000, tenureRequired: 36 },
      { title: 'Managing Director', salary: 42_000, upgradeCost: 260_000, tenureRequired: 48 },
      { title: 'Partner',           salary: 72_000, upgradeCost: 600_000, tenureRequired: 60 },
    ],
  },
  {
    id: 'tech',
    name: 'Tech',
    company: 'Vertex Labs',
    tagline: 'Product + engineering. Balanced pace, equity-heavy.',
    color: '#5a8a52',
    levels: [
      { title: 'Junior Engineer',       salary:  4_000, upgradeCost:      0, tenureRequired:  0 },
      { title: 'Software Engineer',     salary:  7_000, upgradeCost:  8_000, tenureRequired: 12 },
      { title: 'Senior Engineer',       salary: 11_500, upgradeCost: 22_000, tenureRequired: 18 },
      { title: 'Staff Engineer',        salary: 18_000, upgradeCost: 65_000, tenureRequired: 24 },
      { title: 'Principal Engineer',    salary: 28_000, upgradeCost: 160_000, tenureRequired: 36 },
      { title: 'Distinguished Engineer',salary: 48_000, upgradeCost: 380_000, tenureRequired: 48 },
    ],
  },
  {
    id: 'sales',
    name: 'Tech Sales',
    company: 'Nimbus Software',
    tagline: 'Enterprise SaaS sales. Base + commission; high ceiling, quota pressure.',
    color: '#c88a4a',
    levels: [
      { title: 'SDR',               salary:  5_800, upgradeCost:      0, tenureRequired:  0 },
      { title: 'Account Executive', salary: 12_500, upgradeCost: 10_000, tenureRequired: 12 },
      { title: 'Senior AE',         salary: 18_000, upgradeCost: 25_000, tenureRequired: 18 },
      { title: 'Enterprise AE',     salary: 27_000, upgradeCost: 70_000, tenureRequired: 24 },
      { title: 'Sales Director',    salary: 37_500, upgradeCost: 180_000, tenureRequired: 36 },
      { title: 'VP Sales',          salary: 54_000, upgradeCost: 420_000, tenureRequired: 48 },
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting',
    company: 'Northstar Advisory',
    tagline: 'Strategy consulting. Steady, travel-heavy, prestige-lite.',
    color: '#b48ac1',
    levels: [
      { title: 'Analyst',         salary:  3_500, upgradeCost:      0, tenureRequired:  0 },
      { title: 'Consultant',      salary:  6_000, upgradeCost:  6_500, tenureRequired: 12 },
      { title: 'Manager',         salary: 10_000, upgradeCost: 18_000, tenureRequired: 18 },
      { title: 'Senior Manager',  salary: 15_500, upgradeCost: 50_000, tenureRequired: 24 },
      { title: 'Partner',         salary: 24_000, upgradeCost: 130_000, tenureRequired: 36 },
      { title: 'Senior Partner',  salary: 40_000, upgradeCost: 300_000, tenureRequired: 48 },
    ],
  },
];
// Legacy single ladder — kept so any imports still typecheck during the migration.
// Points at the Tech track as the default.
export const JOB_LEVELS: JobLevel[] = CAREER_TRACKS.find((t) => t.id === 'tech')!.levels;
export const DEFAULT_CAREER_TRACK_ID = 'tech';
// Monthly rent Ellie pays if she sells her home.
export const RENT_MONTHLY = 2_000;
export const STARTING_CAPITAL = 100_000;
export const STARTING_HOME_VALUE = 350_000;
// Ellie bought the house with a mortgage. ~85% LTV, standard first-home loan.
export const STARTING_DEBT = 295_000;
export const STARTING_AGE = 25;
// Default fallback appreciation; the active tier overrides this per-month.
export const HOME_APPRECIATION_YEARLY = 0.03;
export const BANKRUPTCY_THRESHOLD = -25_000;

// Home tiers Ellie can live in. Upgrading sells the current place at its market
// value, pays off the mortgage from proceeds, then buys the new tier at list price.
export interface HomeTier {
  id: string;
  name: string;
  price: number;
  // Monthly upkeep: property tax + insurance + maintenance + utilities, roughly
  // 1.5-2% of home value per year, higher share at the luxury end.
  monthlyExpense: number;
  appreciationYearly: number;
  description: string;
  // Visual: which AssetSprite variant to render on the map, and how to tint/scale it.
  visual: {
    category: 'real_estate' | 'commercial' | 'tower';
    sprite?: string; // overrides category default; e.g. 'hotel', 'office'
    color: string;
    size: number;
    floors?: number;
  };
}
export const HOME_TIERS: HomeTier[] = [
  {
    id: 'studio',
    name: 'Studio Apartment',
    price: 150_000,
    monthlyExpense: 350,
    appreciationYearly: 0.025,
    description: 'Small one-room condo. Minimal upkeep.',
    visual: { category: 'real_estate', color: '#8b8f98', size: 0.9 },
  },
  {
    id: 'starter',
    name: 'Starter Home',
    price: 350_000,
    monthlyExpense: 800,
    appreciationYearly: 0.03,
    description: 'Modest suburban house. Classic first home.',
    visual: { category: 'real_estate', color: '#e2b579', size: 1.25 },
  },
  {
    id: 'townhouse',
    name: 'Townhouse',
    price: 650_000,
    monthlyExpense: 1_400,
    appreciationYearly: 0.03,
    description: 'Three-floor row house in a nicer neighborhood.',
    visual: { category: 'real_estate', color: '#d9a860', size: 1.5 },
  },
  {
    id: 'villa',
    name: 'Luxury Villa',
    price: 1_500_000,
    monthlyExpense: 3_500,
    appreciationYearly: 0.035,
    description: 'Private garden, pool, prestige address.',
    visual: { category: 'commercial', sprite: 'villa', color: '#f0e6cf', size: 1.15 },
  },
  {
    id: 'mansion',
    name: 'Mansion',
    price: 4_000_000,
    monthlyExpense: 9_500,
    appreciationYearly: 0.04,
    description: 'Multi-wing estate with staff quarters.',
    visual: { category: 'commercial', sprite: 'mansion', color: '#efe3c2', size: 1.1 },
  },
  {
    id: 'estate',
    name: 'Luxury Estate',
    price: 12_000_000,
    monthlyExpense: 28_000,
    appreciationYearly: 0.04,
    description: 'Trophy property. Private cinema, vineyard, helipad.',
    visual: { category: 'commercial', sprite: 'estate', color: '#f5ead1', size: 1.0 },
  },
];
export const STARTING_HOME_TIER_ID = 'starter';
// Bank
export const MORTGAGE_RATE_YEARLY = 0.065;
// 30-year amortizing mortgage. The monthly payment factor is the k in
// payment = debt × k, derived from the standard amortization formula
// k = r(1+r)^n / ((1+r)^n − 1) with r = monthlyRate(0.065) and n = 360.
// Payment = interest (debt × r) + principal (debt × (k − r)), so debt
// gradually declines as long as the loan is being serviced.
export const MORTGAGE_PAYMENT_FACTOR_MONTHLY = 0.00632;
// Max loan-to-value against (home + asset) collateral.
export const MAX_LTV = 0.75;
