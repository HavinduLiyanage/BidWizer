/**
 * FX conversion utilities
 */

import { env } from '@/lib/env'

export function getUSDtoLKR(): number {
  const rate = Number(env.NEXT_PUBLIC_FX_USD_LKR)
  return Number.isFinite(rate) && rate > 0 ? rate : 330
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

