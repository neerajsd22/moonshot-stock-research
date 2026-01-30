import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pin, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const StockCardWithChart = ({ 
  stock, 
  isStockPinned, 
  onPin, 
  onUnpin, 
  onDismiss,
  getCurrencySymbol,
  onPeriodChange,
  currentPeriod,
  onAdvancedChart,
  isSelected,
  onSelect
}) => {
  const { quote, ticker, historicalData = [] } = stock;
  const chartRef = useRef(null);
  
  // Calculate chart color based on price movement
  const chartColor = historicalData.length > 1 
    ? (historicalData[historicalData.length - 1]?.close >= historicalData[0]?.close 
      ? '#22c55e'  // Green for up
      : '#ef4444') // Red for down
    : '#22c55e';
  
  const isUp = chartColor === '#22c55e';
  
  // Format X axis based on period - clean and simple
  const formatXAxisTick = (dateStr) => {
    const date = new Date(dateStr);
    if (currentPeriod === '1mo') {
      // Show "Jan 5" format for 1 month view
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (currentPeriod === '3mo') {
      // Show "Jan 5" format for 3 month view
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (['6mo', '1y'].includes(currentPeriod)) {
      // Show just month: "Jan", "Feb", etc.
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    // 5Y: Show "Jan '22", "Jul '23", etc.
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };
  
  // Calculate optimal tick interval based on data length and period
  const getTickInterval = () => {
    const len = historicalData.length;
    if (currentPeriod === '1mo') return Math.max(4, Math.floor(len / 5));
    if (currentPeriod === '3mo') return Math.max(8, Math.floor(len / 6));
    if (currentPeriod === '6mo') return Math.max(15, Math.floor(len / 6));
    if (currentPeriod === '1y') return Math.max(30, Math.floor(len / 6));
    return Math.max(60, Math.floor(len / 6)); // 5Y
  };

  // Calculate price range for mini stats
  const priceRange = historicalData.length > 0 ? {
    high: Math.max(...historicalData.map(d => d.close)),
    low: Math.min(...historicalData.map(d => d.close)),
    start: historicalData[0]?.close,
    end: historicalData[historicalData.length - 1]?.close
  } : null;
  
  const periodChange = priceRange ? ((priceRange.end - priceRange.start) / priceRange.start * 100).toFixed(2) : 0;

  return (
    <Card 
      className={`premium-card gold-gradient-border transition-all duration-200 ${isSelected ? 'ring-2 ring-[#d946ef]/50' : ''}`}
      onClick={() => onSelect && onSelect(ticker)}
    >
      <CardContent className="p-4">
        {/* Top Row: Ticker, Price, Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: Ticker & Company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-xl lg:text-2xl font-bold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid={`stock-ticker-${ticker}`}
              >
                {quote.ticker}
              </h2>
              {quote.market_state && (
                <Badge 
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0.5 ${quote.market_state === 'REGULAR' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[rgba(255,255,255,0.05)] text-gray-400'}`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse"></span>
                  {quote.market_state === 'REGULAR' ? 'Open' : 'Closed'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">{quote.company_name}</p>
          </div>
          
          {/* Center: Price & Change */}
          <div className="text-right">
            <div className="text-xl lg:text-2xl font-bold text-white mono-numbers">
              {getCurrencySymbol(ticker, quote.currency)}{quote.price?.toFixed(2)}
            </div>
            <div className={`text-xs font-medium mono-numbers flex items-center justify-end gap-1 ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {quote.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.change_percent?.toFixed(2)}%)
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                isStockPinned(quote.ticker) ? onUnpin(quote.ticker) : onPin(quote.ticker, quote.company_name);
              }}
              className="h-7 px-2 text-xs btn-outline-gold"
            >
              <Pin className={`w-3 h-3 ${isStockPinned(quote.ticker) ? 'fill-[#d946ef] text-[#d946ef]' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(ticker);
              }}
              className="h-7 px-2 text-xs text-red-400 border-red-400/30 hover:bg-red-500/10"
              data-testid={`dismiss-stock-${ticker}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="relative">
          {/* Period Tabs & Advanced Button */}
          <div className="flex items-center justify-between mb-3">
            <Tabs value={currentPeriod} onValueChange={(val) => onPeriodChange && onPeriodChange(val, ticker)}>
              <TabsList className="h-8 bg-[rgba(255,255,255,0.03)] p-0.5 rounded-md">
                {['1mo', '3mo', '6mo', '1y', '5y'].map(p => (
                  <TabsTrigger 
                    key={p} 
                    value={p} 
                    className="h-7 px-3 text-xs font-medium data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-3">
              {/* Period Performance */}
              {priceRange && (
                <span className={`text-sm font-medium mono-numbers ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? '+' : ''}{periodChange}%
                </span>
              )}
              {onAdvancedChart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvancedChart(ticker);
                  }}
                  className="h-6 px-2 text-[10px] btn-outline-gold"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Advanced
                </Button>
              )}
            </div>
          </div>
          
          {/* Chart - 30% larger */}
          <div ref={chartRef} className="h-[160px]" data-testid={`stock-chart-${ticker}`}>
            {historicalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historicalData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id={`areaGradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                    tickFormatter={formatXAxisTick}
                    interval={getTickInterval()}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    dy={5}
                  />
                  <YAxis
                    hide
                    domain={['dataMin', 'dataMax']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,15,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'Price']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={chartColor}
                    strokeWidth={1.5}
                    fill={`url(#areaGradient-${ticker})`}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                Loading chart...
              </div>
            )}
          </div>
        </div>

        {/* Key Stats Row - Compact */}
        <div className="grid grid-cols-5 lg:grid-cols-9 gap-2 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          {quote.day_open && (
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Open</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_open.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_high && (
            <div className="text-center">
              <div className="text-[10px] text-gray-500">High</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_high.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_low && (
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Low</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_low.toFixed(2)}
              </div>
            </div>
          )}
          {quote.market_cap && (
            <div className="text-center">
              <div className="text-[10px] text-gray-500">Mkt Cap</div>
              <div className="text-xs font-medium text-white mono-numbers">
                ${(quote.market_cap / 1e9).toFixed(0)}B
              </div>
            </div>
          )}
          {quote.pe_ratio && (
            <div className="text-center">
              <div className="text-[10px] text-gray-500">P/E</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {quote.pe_ratio.toFixed(1)}
              </div>
            </div>
          )}
          {quote.dividend_yield !== null && quote.dividend_yield !== undefined && (
            <div className="text-center hidden lg:block">
              <div className="text-[10px] text-gray-500">Div</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {quote.dividend_yield.toFixed(2)}%
              </div>
            </div>
          )}
          {quote.high_52week && (
            <div className="text-center hidden lg:block">
              <div className="text-[10px] text-gray-500">52W H</div>
              <div className="text-xs font-medium text-white mono-numbers">
                ${quote.high_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.low_52week && (
            <div className="text-center hidden lg:block">
              <div className="text-[10px] text-gray-500">52W L</div>
              <div className="text-xs font-medium text-white mono-numbers">
                ${quote.low_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.volume && (
            <div className="text-center hidden lg:block">
              <div className="text-[10px] text-gray-500">Vol</div>
              <div className="text-xs font-medium text-white mono-numbers">
                {(quote.volume / 1e6).toFixed(1)}M
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockCardWithChart;
