import { useState, useCallback } from 'react';

const STORAGE_KEY = 'outlierGov_watchlist';

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(npis: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(npis));
}

export function useWatchlist() {
  const [watchlistNpis, setWatchlistNpis] = useState<string[]>(readFromStorage);

  const watchlistSet = new Set(watchlistNpis);

  const toggleWatchlist = useCallback((npi: string) => {
    setWatchlistNpis((prev) => {
      const next = prev.includes(npi)
        ? prev.filter((n) => n !== npi)
        : [...prev, npi];
      writeToStorage(next);
      return next;
    });
  }, []);

  return {
    watchlistSet,
    isLoading: false,
    toggleWatchlist,
    isToggling: false,
  };
}
