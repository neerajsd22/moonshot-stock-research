import { useEffect, useState, useCallback } from 'react';
import { portfolioApi } from './api';

/**
 * Polls /api/portfolio/summary every 60s so the header dot stays current.
 * Returns { summary, loading, refresh }. summary === null while loading.
 */
export const usePortfolioSummary = (intervalMs = 60_000) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await portfolioApi.summary();
      setSummary(data);
    } catch (err) {
      console.warn('Portfolio summary failed:', err.message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { summary, loading, refresh };
};
