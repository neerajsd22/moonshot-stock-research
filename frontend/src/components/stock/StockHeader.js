import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, X } from 'lucide-react';

const StockHeader = ({ 
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
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <h2
                className="text-3xl lg:text-4xl font-bold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid={`stock-ticker-${ticker}`}
              >
                {quote.ticker}
              </h2>
              
              {/* Market Status Badge */}
              {quote.market_state && (
                <Badge 
                  variant={quote.market_state === 'REGULAR' ? 'default' : 'secondary'}
                  className={`${quote.market_state === 'REGULAR' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[rgba(255,255,255,0.05)] text-gray-400'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse"></span>
                  {quote.market_state === 'REGULAR' ? 'Market Open' : 'Market Closed'}
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isStockPinned(quote.ticker)
                    ? onUnpin(quote.ticker)
                    : onPin(quote.ticker, quote.company_name)
                }
                className="flex items-center gap-2 btn-outline-gold"
              >
                <Pin className={`w-4 h-4 ${isStockPinned(quote.ticker) ? 'fill-[#d946ef] text-[#d946ef]' : ''}`} />
                {isStockPinned(quote.ticker) ? 'Unpin' : 'Pin'}
              </Button>
              
              {/* Dismiss Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDismiss(ticker)}
                className="flex items-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400"
                data-testid={`dismiss-stock-${ticker}`}
              >
                <X className="w-4 h-4" />
                Dismiss
              </Button>
            </div>
            <p className="text-base text-gray-400 mt-2">
              {quote.company_name}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-4xl lg:text-5xl font-bold text-white mono-numbers">
              {getCurrencySymbol(ticker, quote.currency)}{quote.price?.toFixed(2)}
            </div>
            <div className={`text-base font-medium mt-2 mono-numbers ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.change_percent?.toFixed(2)}%)
            </div>
            
            {/* Extended Hours Prices */}
            {(quote.pre_market || quote.post_market) && (
              <div className="mt-3 p-3 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.08)] text-left">
                <div className="text-xs text-gray-500 mb-2 font-medium">Extended Hours</div>
                {quote.pre_market && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-400">Pre-Market</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white mono-numbers">
                        {getCurrencySymbol(ticker, quote.currency)}{quote.pre_market.price?.toFixed(2)}
                      </span>
                      <span className={`text-xs mono-numbers ${quote.pre_market.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {quote.pre_market.change >= 0 ? '+' : ''}{quote.pre_market.change?.toFixed(2)} ({quote.pre_market.change_percent?.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}
                {quote.post_market && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-400">After Hours</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white mono-numbers">
                        {getCurrencySymbol(ticker, quote.currency)}{quote.post_market.price?.toFixed(2)}
                      </span>
                      <span className={`text-xs mono-numbers ${quote.post_market.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {quote.post_market.change >= 0 ? '+' : ''}{quote.post_market.change?.toFixed(2)} ({quote.post_market.change_percent?.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockHeader;
