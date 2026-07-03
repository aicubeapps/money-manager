import { useCallback } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency as formatCurrencyINR } from '../utils/format';
import { ALL_CURRENCIES, convertFromINR } from '../services/currencyService';

const formatFiatAmount = (value: number, symbol: string) => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol}${formatted}`;
};

// Crypto units per rupee are tiny (e.g. a ₹100 expense might be a few
// hundred-thousandths of a BTC), so a flat 2-decimal format would show
// "0.00" for most everyday amounts. Scale precision to the magnitude
// instead, enough to keep the value legible without unbounded decimals.
const formatCryptoAmount = (value: number, symbol: string) => {
  const abs = Math.abs(value);
  let decimals = 2;
  if (abs < 1) decimals = 6;
  if (abs < 0.001) decimals = 8;
  return `${symbol}${value.toFixed(decimals)}`;
};

/**
 * Returns a formatCurrency(amountINR) function that mirrors the plain util
 * in utils/format.ts, but converts to the user's chosen display currency
 * (Settings → Display Currency) when that's enabled and a rate is
 * available. Falls back to INR formatting when conversion is off, or when
 * rates aren't available for the selected currency — so callers never need
 * to handle a null/undefined case themselves.
 */
export const useFormatCurrency = () => {
  const { enabled, targetCurrency, fiatRates, cryptoRates } = useCurrency();

  return useCallback(
    (amountINR: number): string => {
      if (!enabled) return formatCurrencyINR(amountINR);

      const currency = ALL_CURRENCIES.find((c) => c.code === targetCurrency);
      if (!currency) return formatCurrencyINR(amountINR);

      const converted = convertFromINR(amountINR, targetCurrency, { fiatRates, cryptoRates });
      if (converted === null) return formatCurrencyINR(amountINR);

      return currency.type === 'crypto'
        ? formatCryptoAmount(converted, currency.symbol)
        : formatFiatAmount(converted, currency.symbol);
    },
    [enabled, targetCurrency, fiatRates, cryptoRates]
  );
};
