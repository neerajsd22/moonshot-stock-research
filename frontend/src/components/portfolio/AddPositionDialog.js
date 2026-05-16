import { useState } from 'react';
import axios from 'axios';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { portfolioApi } from './api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddPositionDialog = ({ isOpen, onClose, onAdded }) => {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTickerChange = async (val) => {
    setTicker(val.toUpperCase());
    if (val.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/stocks/search`, { params: { q: val, exchange: 'us' } });
      setSearchResults(res.data.slice(0, 5));
    } catch {
      setSearchResults([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) {
      toast.error('Ticker, shares, and avg cost are required');
      return;
    }
    const sharesNum = parseFloat(shares);
    const costNum = parseFloat(avgCost);
    if (sharesNum <= 0 || costNum <= 0) {
      toast.error('Shares and cost must be positive numbers');
      return;
    }
    setSubmitting(true);
    try {
      await portfolioApi.add({
        ticker: ticker.trim().toUpperCase(),
        shares: sharesNum,
        avg_cost: costNum,
        buy_date: buyDate || null,
      });
      toast.success(`${ticker.toUpperCase()} added to portfolio`);
      setTicker(''); setShares(''); setAvgCost(''); setBuyDate('');
      setSearchResults([]);
      onAdded && onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add position');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm fade-in"
      data-testid="add-position-dialog"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md bg-[rgba(10,10,15,0.98)] border border-[rgba(217,70,239,0.25)] rounded-t-2xl sm:rounded-2xl gold-gradient-border">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
          <h2 className="text-lg font-bold gold-text" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Add Position
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]" data-testid="add-position-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Ticker</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={ticker}
                onChange={(e) => handleTickerChange(e.target.value)}
                placeholder="AAPL, MSFT, NVDA..."
                className="pl-9 bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
                data-testid="add-position-ticker"
                autoFocus
              />
            </div>
            {searchResults.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSearchResults([])} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(20,20,25,0.98)] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {searchResults.map(r => (
                    <button
                      key={r.ticker}
                      type="button"
                      onClick={() => { setTicker(r.ticker); setSearchResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-[rgba(217,70,239,0.1)] transition-colors"
                      data-testid={`add-position-suggest-${r.ticker}`}
                    >
                      <div className="text-sm font-semibold text-white">{r.ticker}</div>
                      <div className="text-xs text-gray-400 truncate">{r.name}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Shares</label>
              <Input
                type="number"
                step="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="50"
                className="bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
                data-testid="add-position-shares"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Avg cost / share ($)</label>
              <Input
                type="number"
                step="0.01"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="420.10"
                className="bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
                data-testid="add-position-cost"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Buy date <span className="text-gray-600">(optional)</span></label>
            <Input
              type="date"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              className="bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
              data-testid="add-position-date"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" data-testid="add-position-cancel">Cancel</Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-[#d946ef] hover:bg-[#f0abfc] text-[#0a0a0f] font-semibold" data-testid="add-position-submit">
              {submitting ? 'Adding...' : 'Add Position'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPositionDialog;
