import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, X } from 'lucide-react';

const StockCard = ({ 
  stock, 
  isStockPinned, 
  onPin, 
  onUnpin, 
  onDismiss,
  getCurrencySymbol 
}) => {
  const { quote, ticker } = stock;
  
  return (
    <Card className="premium-card gold-gradient-border">
      <CardContent className="p-4 lg:p-5">
        {/* Header Row - Ticker, Price, Actions */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          {/* Left: Ticker & Company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2
                className="text-2xl lg:text-3xl font-bold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid={`stock-ticker-${ticker}`}
              >
                {quote.ticker}
              </h2>
              
              {/* Market Status Badge */}
              {quote.market_state && (
                <Badge 
                  variant={quote.market_state === 'REGULAR' ? 'default' : 'secondary'}
                  className={`text-xs ${quote.market_state === 'REGULAR' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[rgba(255,255,255,0.05)] text-gray-400'}`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse"></span>
                  {quote.market_state === 'REGULAR' ? 'Open' : 'Closed'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1 truncate">
              {quote.company_name}
            </p>
          </div>
          
          {/* Center: Price */}
          <div className="text-right">
            <div className="text-2xl lg:text-3xl font-bold text-white mono-numbers">
              {getCurrencySymbol(ticker, quote.currency)}{quote.price?.toFixed(2)}
            </div>
            <div className={`text-sm font-medium mono-numbers ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.change_percent?.toFixed(2)}%)
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isStockPinned(quote.ticker)
                  ? onUnpin(quote.ticker)
                  : onPin(quote.ticker, quote.company_name)
              }
              className="flex items-center gap-1.5 btn-outline-gold h-8 px-2.5 text-xs"
            >
              <Pin className={`w-3.5 h-3.5 ${isStockPinned(quote.ticker) ? 'fill-[#d946ef] text-[#d946ef]' : ''}`} />
              {isStockPinned(quote.ticker) ? 'Unpin' : 'Pin'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDismiss(ticker)}
              className="flex items-center gap-1.5 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400 h-8 px-2.5 text-xs"
              data-testid={`dismiss-stock-${ticker}`}
            >
              <X className="w-3.5 h-3.5" />
              Dismiss
            </Button>
          </div>
        </div>
        
        {/* Extended Hours - Compact */}
        {(quote.pre_market || quote.post_market) && (
          <div className="mb-4 p-2.5 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500 font-medium">Extended:</span>
              {quote.pre_market && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Pre</span>
                  <span className="text-white mono-numbers">
                    {getCurrencySymbol(ticker, quote.currency)}{quote.pre_market.price?.toFixed(2)}
                  </span>
                  <span className={`mono-numbers ${quote.pre_market.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {quote.pre_market.change >= 0 ? '+' : ''}{quote.pre_market.change_percent?.toFixed(2)}%
                  </span>
                </div>
              )}
              {quote.post_market && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">After</span>
                  <span className="text-white mono-numbers">
                    {getCurrencySymbol(ticker, quote.currency)}{quote.post_market.price?.toFixed(2)}
                  </span>
                  <span className={`mono-numbers ${quote.post_market.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {quote.post_market.change >= 0 ? '+' : ''}{quote.post_market.change_percent?.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Key Stats Grid - Compact */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {quote.day_open && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">Open</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_open.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_high && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">High</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_high.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_low && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">Low</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_low.toFixed(2)}
              </div>
            </div>
          )}
          {quote.market_cap && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">Mkt Cap</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                ${(quote.market_cap / 1e9).toFixed(1)}B
              </div>
            </div>
          )}
          {quote.pe_ratio && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">P/E</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {quote.pe_ratio.toFixed(1)}
              </div>
            </div>
          )}
          {quote.dividend_yield !== null && quote.dividend_yield !== undefined && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">Div</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {quote.dividend_yield.toFixed(2)}%
              </div>
            </div>
          )}
          {quote.high_52week && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">52W H</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.high_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.low_52week && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">52W L</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.low_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.volume && (
            <div className="stat-item-compact">
              <div className="text-xs text-gray-500">Vol</div>
              <div className="text-sm font-semibold text-white mono-numbers">
                {(quote.volume / 1e6).toFixed(1)}M
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockCard;
