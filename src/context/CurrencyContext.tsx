import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getRates, type RateCache } from '../services/currencyService';

interface CurrencyContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  targetCurrency: string;
  setTargetCurrency: (code: string) => void;
  fiatRates: RateCache['fiatRates'];
  cryptoRates: RateCache['cryptoRates'];
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const ENABLED_KEY = 'displayCurrencyEnabled';
const CODE_KEY = 'displayCurrencyCode';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabledState] = useState<boolean>(() => localStorage.getItem(ENABLED_KEY) === 'true');
  const [targetCurrency, setTargetCurrencyState] = useState<string>(
    () => localStorage.getItem(CODE_KEY) || 'USD'
  );
  const [fiatRates, setFiatRates] = useState<RateCache['fiatRates']>(null);
  const [cryptoRates, setCryptoRates] = useState<RateCache['cryptoRates']>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const result = await getRates(forceRefresh);
    setFiatRates(result.fiatRates);
    setCryptoRates(result.cryptoRates);
    setLastUpdated(result.fetchedAt);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    localStorage.setItem(ENABLED_KEY, String(next));
  };

  const setTargetCurrency = (code: string) => {
    setTargetCurrencyState(code);
    localStorage.setItem(CODE_KEY, code);
  };

  const refresh = () => load(true);

  return (
    <CurrencyContext.Provider
      value={{
        enabled,
        setEnabled,
        targetCurrency,
        setTargetCurrency,
        fiatRates,
        cryptoRates,
        lastUpdated,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
