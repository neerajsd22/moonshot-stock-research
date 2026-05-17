import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Mobile/tablet (<1024px) only.
 * Renders a floating purple search button bottom-right.
 * Tap → bottom sheet slides up with search input + live results.
 * Reuses the same searchStocks() / selectStock() data flow as the header.
 */
const MobileSearchSheet = ({
  searchQuery,
  setSearchQuery,
  searchStocks,
  searchResults,
  setSearchResults,
  selectStock,
}) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  // Esc + body scroll lock + autofocus
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open]);

  const handleSelect = (ticker) => {
    selectStock(ticker);
    setOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Floating purple search button (mobile/tablet only) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="mobile-search-fab"
          aria-label="Search stocks"
          className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full lg:hidden
                     flex items-center justify-center text-white
                     transition-transform duration-200 hover:scale-105 active:scale-95
                     shadow-[0_8px_24px_rgba(217,70,239,0.5),0_0_0_4px_rgba(217,70,239,0.15)]"
          style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 100%)' }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-[#d946ef]/50 animate-ping"
          />
          <Search className="w-6 h-6 relative" strokeWidth={2.5} />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm fade-in lg:hidden"
          data-testid="mobile-search-sheet"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="w-full bg-[rgba(10,10,15,0.98)] border-t border-[rgba(217,70,239,0.25)]
                       rounded-t-3xl shadow-[0_-24px_64px_rgba(0,0,0,0.6)]
                       max-h-[85vh] flex flex-col gold-gradient-border"
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            {/* Drag handle */}
            <button
              type="button"
              onClick={handleClose}
              className="w-12 h-1.5 rounded-full bg-[rgba(255,255,255,0.15)] mx-auto mt-3 mb-2 hover:bg-[rgba(255,255,255,0.25)] transition-colors"
              aria-label="Close search"
              data-testid="mobile-search-handle"
            />

            {/* Branded header (Moonshot · Stock Search) */}
            <div className="flex items-center justify-center gap-2 px-5 pb-3 pt-1 border-b border-[rgba(255,255,255,0.06)]">
              <TrendingUp className="w-4 h-4 text-[#d946ef]" />
              <span className="gold-text font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em' }}>
                Moonshot
              </span>
              <span className="text-xs text-gray-500">· Stock Search</span>
            </div>

            {/* Search input */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <Search className="w-5 h-5 text-[#d946ef] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchStocks(e.target.value);
                }}
                placeholder="Search by ticker or company name..."
                className="flex-1 bg-transparent outline-none text-base text-white placeholder-gray-500"
                data-testid="mobile-search-input"
              />
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                data-testid="mobile-search-close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide px-3 pt-1 pb-1">
                    Results
                  </div>
                  {searchResults.map((result) => (
                    <button
                      key={result.ticker}
                      data-testid={`mobile-search-result-${result.ticker}`}
                      onClick={() => handleSelect(result.ticker)}
                      className="w-full text-left p-3 hover:bg-[rgba(217,70,239,0.08)] active:bg-[rgba(217,70,239,0.12)] rounded-lg transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {result.ticker}
                          </div>
                          <div className="text-xs text-gray-400 truncate">{result.name}</div>
                        </div>
                        {result.exchange && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {result.exchange}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length > 0 ? (
                <div className="text-center py-10 text-sm text-gray-500">
                  No results for "{searchQuery}"
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-gray-500">
                  Start typing to search stocks…
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default MobileSearchSheet;
