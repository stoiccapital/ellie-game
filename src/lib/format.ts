// European-style formatting with k/m/b compacting.
// "number space unit" rule — values ≥ 1 000 compact.

export function money(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)} b`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)} m`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)} k`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)} k`;
  return `${sign}$${Math.round(abs).toString()}`;
}

export function moneyFull(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const formatted = Math.round(abs).toLocaleString('en-US').replace(/,/g, ' ');
  return `${sign}$${formatted}`;
}

export function moneyPerMonth(n: number): string {
  return `${money(n)} /mo`;
}

export function timeStamp(month: number): { label: string; years: number; months: number } {
  const years = Math.floor(month / 12);
  const months = month % 12;
  if (years === 0) return { label: `Month ${months}`, years, months };
  if (months === 0) return { label: `Year ${years}`, years, months };
  return { label: `Y${years} · M${months}`, years, months };
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)} %`;
}
