/**
 * FX conversion utilities
 */

export function getUSDtoLKR(): number {
  return Number(process.env.NEXT_PUBLIC_FX_USD_LKR) || 330;
}

export function formatUSD(amount: number): string {
  return `$${amount}`;
}

export function formatLKR(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}

export function convertUSDtoLKR(usd: number): number {
  return usd * getUSDtoLKR();
}

export function formatPriceWithConversion(usd: number): string {
  const lkr = convertUSDtoLKR(usd);
  return `${formatUSD(usd)} ≈ ${formatLKR(lkr)}`;
}

