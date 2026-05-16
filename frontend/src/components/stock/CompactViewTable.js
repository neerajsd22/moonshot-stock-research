import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, X, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const MiniSparkline = ({ data, isUp }) => {
  if (!data || data.length < 2) return <div className="w-full h-full bg-[rgba(255,255,255,0.03)] rounded" />;

  // Sample down to ~20 points for performance
  const step = Math.max(1, Math.floor(data.length / 20));
  const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sampled}>
        <Line
          type="monotone"
          dataKey="close"
          stroke={isUp ? '#4ade80' : '#f87171'}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const CompactViewTable = ({ 
  stackedStocks, 
  maxStocks, 
  onExpand, 
  onDismiss,
  onSelectStock,
  getCurrencySymbol 
}) => {
  return (
    <div className="fade-in" data-testid="compact-view-container">
      <Card className="premium-card gold-gradient-border overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-lg text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Stacked Stocks ({stackedStocks.length}/{maxStocks})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              className="flex items-center gap-2 btn-outline-gold"
              data-testid="expand-view-button"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Expand</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 space-y-1">
          {stackedStocks.map((stock) => {
            const isUp = stock.quote.change >= 0;
            const currency = getCurrencySymbol(stock.ticker, stock.quote.currency);

            return (
              <div
                key={stock.ticker}
                data-testid={`compact-row-${stock.ticker}`}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(217,70,239,0.06)] border border-transparent hover:border-[rgba(217,70,239,0.15)] transition-all cursor-pointer group"
                onClick={() => onSelectStock && onSelectStock(stock.ticker)}
              >
                {/* Ticker */}
                <div className="w-[52px] sm:w-[64px] flex-shrink-0">
                  <div className="text-xs sm:text-sm font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {stock.ticker}
                  </div>
                </div>

                {/* Sparkline */}
                <div className="h-[28px] sm:h-[32px] flex-1 min-w-[80px] max-w-[200px]">
                  <MiniSparkline data={stock.historicalData} isUp={isUp} />
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0 min-w-[70px] sm:min-w-[85px]">
                  <div className="text-xs sm:text-sm font-semibold text-white mono-numbers">
                    {currency}{stock.quote.price?.toFixed(2)}
                  </div>
                </div>

                {/* Change */}
                <div className={`text-right flex-shrink-0 min-w-[65px] sm:min-w-[80px] flex items-center justify-end gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3 hidden sm:block" /> : <TrendingDown className="w-3 h-3 hidden sm:block" />}
                  <span className="text-[11px] sm:text-xs font-medium mono-numbers">
                    {isUp ? '+' : ''}{stock.quote.change_percent?.toFixed(2)}%
                  </span>
                </div>

                {/* Dismiss */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDismiss(stock.ticker); }}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  data-testid={`compact-dismiss-${stock.ticker}`}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactViewTable;
