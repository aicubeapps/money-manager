// Display-only currency conversion service. Nothing about the app's data
// model changes — all transactions/accounts/budgets remain stored in INR.
// This only fetches exchange rates and caches them for the display layer
// (see src/context/CurrencyContext.tsx and src/hooks/useFormatCurrency.ts).

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  type: 'fiat' | 'crypto';
}

// Common fiat currencies. Symbols kept explicit (rather than relying on
// Intl's currency-code-to-symbol mapping) so formatting stays consistent
// regardless of locale support for a given code.
export const FIAT_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', type: 'fiat' },
  { code: 'EUR', symbol: '€', name: 'Euro', type: 'fiat' },
  { code: 'GBP', symbol: '£', name: 'British Pound', type: 'fiat' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', type: 'fiat' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', type: 'fiat' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', type: 'fiat' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', type: 'fiat' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', type: 'fiat' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', type: 'fiat' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', type: 'fiat' },
];

// Top 10 crypto by market cap — a point-in-time judgment call (roughly
// early-to-mid 2020s rankings). Market cap order shifts, so this list may
// drift out of date; update if/when it matters for this app.
// CoinGecko ids are what the /simple/price endpoint expects.
export const CRYPTO_CURRENCIES: (CurrencyOption & { coingeckoId: string })[] = [
  { code: 'BTC', symbol: '₿', name: 'Bitcoin', type: 'crypto', coingeckoId: 'bitcoin' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', type: 'crypto', coingeckoId: 'ethereum' },
  { code: 'USDT', symbol: '₮', name: 'Tether', type: 'crypto', coingeckoId: 'tether' },
  { code: 'XRP', symbol: 'XRP', name: 'XRP (Ripple)', type: 'crypto', coingeckoId: 'ripple' },
  { code: 'BNB', symbol: 'BNB', name: 'BNB', type: 'crypto', coingeckoId: 'binancecoin' },
  { code: 'SOL', symbol: 'SOL', name: 'Solana', type: 'crypto', coingeckoId: 'solana' },
  { code: 'USDC', symbol: 'USDC', name: 'USD Coin', type: 'crypto', coingeckoId: 'usd-coin' },
  { code: 'DOGE', symbol: 'Ð', name: 'Dogecoin', type: 'crypto', coingeckoId: 'dogecoin' },
  { code: 'ADA', symbol: 'ADA', name: 'Cardano', type: 'crypto', coingeckoId: 'cardano' },
  { code: 'TRX', symbol: 'TRX', name: 'Tron', type: 'crypto', coingeckoId: 'tron' },
];

export const ALL_CURRENCIES: CurrencyOption[] = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

const FIAT_RATES_URL = 'https://api.exchangerate-api.com/v4/latest/INR';
const CRYPTO_IDS = CRYPTO_CURRENCIES.map((c) => c.coingeckoId).join(',');
const CRYPTO_RATES_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_IDS}&vs_currencies=inr`;

const CACHE_KEY = 'currencyRatesCache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface RateCache {
  /** Units of target fiat currency per 1 INR (i.e. multiply an INR amount by this). */
  fiatRates: Record<string, number> | null;
  /** Units of target crypto per 1 INR. */
  cryptoRates: Record<string, number> | null;
  fetchedAt: number | null;
}

const EMPTY_CACHE: RateCache = { fiatRates: null, cryptoRates: null, fetchedAt: null };

const loadCache = (): RateCache => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_CACHE;
    const parsed = JSON.parse(raw);
    return {
      fiatRates: parsed.fiatRates ?? null,
      cryptoRates: parsed.cryptoRates ?? null,
      fetchedAt: parsed.fetchedAt ?? null,
    };
  } catch {
    return EMPTY_CACHE;
  }
};

const saveCache = (cache: RateCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota/availability issues — cache is a nice-to-have, not required.
  }
};

const fetchFiatRates = async (): Promise<Record<string, number>> => {
  const res = await fetch(FIAT_RATES_URL);
  if (!res.ok) throw new Error(`Fiat rate fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data.rates) throw new Error('Fiat rate response missing rates');
  return data.rates;
};

const fetchCryptoRates = async (): Promise<Record<string, number>> => {
  const res = await fetch(CRYPTO_RATES_URL);
  if (!res.ok) throw new Error(`Crypto rate fetch failed: ${res.status}`);
  const data = await res.json();
  const result: Record<string, number> = {};
  for (const crypto of CRYPTO_CURRENCIES) {
    const inrPerUnit = data[crypto.coingeckoId]?.inr;
    // CoinGecko returns INR-per-1-unit-of-crypto; invert so all rates share
    // the same "units of target per 1 INR" convention as the fiat rates.
    if (typeof inrPerUnit === 'number' && inrPerUnit > 0) {
      result[crypto.code] = 1 / inrPerUnit;
    }
  }
  return result;
};

export interface RatesResult extends RateCache {
  /** True if these rates came from cache because a fresh fetch failed or wasn't attempted. */
  stale: boolean;
  /** Set when rates could not be fetched AND no usable cache exists. */
  error: string | null;
}

/**
 * Returns fiat + crypto rates, using the localStorage cache if it's under
 * 24h old (unless forceRefresh is set). Falls back to a stale cache on
 * fetch failure, and only reports an error when there's no cache at all.
 */
export const getRates = async (forceRefresh = false): Promise<RatesResult> => {
  const cache = loadCache();
  const isFresh = !!cache.fetchedAt && Date.now() - cache.fetchedAt < CACHE_TTL_MS;

  if (!forceRefresh && isFresh && cache.fiatRates && cache.cryptoRates) {
    return { ...cache, stale: false, error: null };
  }

  try {
    const [fiatRates, cryptoRates] = await Promise.all([fetchFiatRates(), fetchCryptoRates()]);
    const fresh: RateCache = { fiatRates, cryptoRates, fetchedAt: Date.now() };
    saveCache(fresh);
    return { ...fresh, stale: false, error: null };
  } catch (err) {
    console.error('Error fetching currency rates:', err);
    if (cache.fiatRates || cache.cryptoRates) {
      return { ...cache, stale: true, error: null };
    }
    return { ...EMPTY_CACHE, stale: true, error: 'Rates unavailable, showing INR' };
  }
};

/** Converts an INR amount into the given currency code. Returns null if no rate is available. */
export const convertFromINR = (
  amountINR: number,
  currencyCode: string,
  rates: Pick<RateCache, 'fiatRates' | 'cryptoRates'>
): number | null => {
  const isCrypto = CRYPTO_CURRENCIES.some((c) => c.code === currencyCode);
  const rate = isCrypto ? rates.cryptoRates?.[currencyCode] : rates.fiatRates?.[currencyCode];
  return typeof rate === 'number' ? amountINR * rate : null;
};
