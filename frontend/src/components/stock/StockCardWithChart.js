import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pin, X, BarChart3, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
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
  onSelect,
  alertCount = 0,
  onCreateAlert
}) => {
  const { quote, ticker, historicalData = [] } = stock;
  const chartRef = useRef(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertCondition, setAlertCondition] = useState('above');
  
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
      <CardContent className="p-3 sm:p-4">
        {/* Top Row: Ticker, Price, Actions */}
        <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
          {/* Left: Ticker & Company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-lg sm:text-xl lg:text-2xl font-bold text-white"
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
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-white mono-numbers">
              {getCurrencySymbol(ticker, quote.currency)}{quote.price?.toFixed(2)}
            </div>
            <div className={`text-[10px] sm:text-xs font-medium mono-numbers flex items-center justify-end gap-1 ${quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {quote.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.change_percent?.toFixed(2)}%)
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            {/* Alert Bell */}
            <Popover open={alertOpen} onOpenChange={setAlertOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 px-1.5 sm:px-2 text-xs btn-outline-gold relative"
                  data-testid={`alert-bell-${ticker}`}
                >
                  <Bell className={`w-3 h-3 ${alertCount > 0 ? 'text-[#d946ef]' : ''}`} />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#d946ef] text-[#0a0a0f] text-[9px] font-bold rounded-full flex items-center justify-center">
                      {alertCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={4}
                className="w-[220px] p-3 bg-[#0f0f14] border border-[rgba(217,70,239,0.2)] shadow-2xl rounded-xl"
                onClick={(e) => e.stopPropagation()}
                data-testid={`alert-popover-${ticker}`}
              >
                <div className="text-xs font-medium text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Set Price Alert
                </div>
                <div className="flex gap-1 mb-2">
                  <Button
                    size="sm"
                    variant={alertCondition === 'above' ? 'default' : 'ghost'}
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 h-7 text-[11px] rounded-md ${alertCondition === 'above' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-400'}`}
                    data-testid={`alert-above-${ticker}`}
                  >
                    Above
                  </Button>
                  <Button
                    size="sm"
                    variant={alertCondition === 'below' ? 'default' : 'ghost'}
                    onClick={() => setAlertCondition('below')}
                    className={`flex-1 h-7 text-[11px] rounded-md ${alertCondition === 'below' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400'}`}
                    data-testid={`alert-below-${ticker}`}
                  >
                    Below
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`$${quote.price?.toFixed(0) || '0'}`}
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    className="h-7 text-xs flex-1 bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`alert-price-input-${ticker}`}
                  />
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[11px] bg-[#d946ef] text-[#0a0a0f] hover:bg-[#f0abfc]"
                    disabled={!alertPrice}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onCreateAlert && alertPrice) {
                        onCreateAlert(ticker, quote.company_name || ticker, parseFloat(alertPrice), alertCondition);
                        setAlertPrice('');
                        setAlertOpen(false);
                      }
                    }}
                    data-testid={`alert-save-${ticker}`}
                  >
                    Set
                  </Button>
                </div>
                <div className="text-[10px] text-gray-500 mt-1.5">
                  Current: {getCurrencySymbol(ticker, quote.currency)}{quote.price?.toFixed(2)}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                isStockPinned(quote.ticker) ? onUnpin(quote.ticker) : onPin(quote.ticker, quote.company_name);
              }}
              className="h-7 px-1.5 sm:px-2 text-xs btn-outline-gold"
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
              className="h-7 px-1.5 sm:px-2 text-xs text-red-400 border-red-400/30 hover:bg-red-500/10"
              data-testid={`dismiss-stock-${ticker}`}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="relative">
          {/* Period Tabs & Advanced Button */}
          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
            <div className="overflow-x-auto scrollbar-hide flex-shrink min-w-0">
              <Tabs value={currentPeriod} onValueChange={(val) => onPeriodChange && onPeriodChange(val, ticker)}>
                <TabsList className="h-7 sm:h-8 bg-[rgba(255,255,255,0.03)] p-0.5 rounded-md">
                  {['1mo', '3mo', '6mo', '1y', '5y'].map(p => (
                    <TabsTrigger 
                      key={p} 
                      value={p} 
                      className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs font-medium data-[state=active]:bg-[#d946ef] data-[state=active]:text-[#0a0a0f]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Period Performance */}
              {priceRange && (
                <span className={`text-xs sm:text-sm font-medium mono-numbers ${isUp ? 'text-green-400' : 'text-red-400'}`}>
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
                  className="h-6 px-1.5 sm:px-2 text-[10px] btn-outline-gold"
                >
                  <BarChart3 className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Advanced</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Chart */}
          <div ref={chartRef} className="h-[130px] sm:h-[160px]" data-testid={`stock-chart-${ticker}`}>
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
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'system-ui' }}
                    tickFormatter={formatXAxisTick}
                    interval={getTickInterval()}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={['dataMin', 'dataMax']}
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'system-ui' }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    width={45}
                    dx={-5}
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

        {/* Key Stats Row - Aligned */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[rgba(255,255,255,0.08)]">
          {quote.day_open && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">Open</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_open.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_high && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">High</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_high.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_low && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">Low</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_low.toFixed(2)}
              </div>
            </div>
          )}
          {quote.market_cap && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">Mkt Cap</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                ${(quote.market_cap / 1e9).toFixed(0)}B
              </div>
            </div>
          )}
          {quote.pe_ratio && (
            <div className="flex flex-col items-center">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">P/E</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                {quote.pe_ratio.toFixed(1)}
              </div>
            </div>
          )}
          {quote.dividend_yield !== null && quote.dividend_yield !== undefined && (
            <div className="flex flex-col items-center hidden sm:flex">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-0.5 sm:mb-1">Div</div>
              <div className="text-xs sm:text-sm font-medium text-white mono-numbers">
                {quote.dividend_yield.toFixed(2)}%
              </div>
            </div>
          )}
          {quote.high_52week && (
            <div className="flex flex-col items-center hidden lg:flex">
              <div className="text-[11px] text-gray-400 mb-1">52W H</div>
              <div className="text-sm font-medium text-white mono-numbers">
                ${quote.high_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.low_52week && (
            <div className="flex flex-col items-center hidden lg:flex">
              <div className="text-[11px] text-gray-400 mb-1">52W L</div>
              <div className="text-sm font-medium text-white mono-numbers">
                ${quote.low_52week.toFixed(0)}
              </div>
            </div>
          )}
          {quote.volume && (
            <div className="flex flex-col items-center hidden lg:flex">
              <div className="text-[11px] text-gray-400 mb-1">Vol</div>
              <div className="text-sm font-medium text-white mono-numbers">
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
