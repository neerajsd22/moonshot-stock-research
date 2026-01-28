import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Cell,
  ReferenceArea,
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom Candlestick Bar Shape
const CandlestickBar = (props) => {
  const { x, y, width, height, payload, yAxisMap } = props;
  if (!payload || !yAxisMap) return null;
  
  const { open, close, high, low } = payload;
  if (open === undefined || close === undefined) return null;
  
  const isGreen = close >= open;
  const color = isGreen ? '#22c55e' : '#ef4444';
  
  // Get Y scale from yAxisMap
  const yAxis = yAxisMap[0] || yAxisMap['0'];
  if (!yAxis) return null;
  
  const { scale } = yAxis;
  if (!scale) return null;
  
  const highY = scale(high);
  const lowY = scale(low);
  const openY = scale(open);
  const closeY = scale(close);
  
  const wickX = x + width / 2;
  const bodyWidth = Math.max(width * 0.6, 3);
  const bodyX = x + (width - bodyWidth) / 2;
  
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
  
  return (
    <g>
      {/* Wick (high to low) */}
      <line
        x1={wickX}
        y1={highY}
        x2={wickX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (open to close) */}
      <rect
        x={bodyX}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const AdvancedChart = ({ ticker, isOpen, onClose }) => {
  const [chartType, setChartType] = useState('candlestick');
  const [period, setPeriod] = useState('3mo');
  const [candleData, setCandleData] = useState([]);
  const [indicatorData, setIndicatorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showIndicators, setShowIndicators] = useState({
    sma20: true,
    sma50: true,
    ema20: false,
    bollingerBands: false,
  });
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);

  const fetchData = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    try {
      const [candleRes, indicatorRes] = await Promise.all([
        axios.get(`${API}/stocks/${ticker}/candlestick?period=${period}`),
        axios.get(`${API}/stocks/${ticker}/indicators?period=${period}`)
      ]);
      
      setCandleData(candleRes.data.data);
      setIndicatorData(indicatorRes.data.indicators);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [ticker, period]);

  useEffect(() => {
    if (isOpen && ticker) {
      fetchData();
    }
  }, [isOpen, ticker, period, fetchData]);

  const formatXAxisTick = (dateStr) => {
    const date = new Date(dateStr);
    if (period === '1mo') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period === '3mo' || period === '6mo') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  };

  // Merge candle and indicator data
  const chartData = useMemo(() => {
    return candleData.map((candle, index) => {
      const indicator = indicatorData[index] || {};
      return {
        ...candle,
        ...indicator,
        // For Bar component - use the close price as the bar value (it will be colored by Cell)
        // The actual candlestick visualization requires us to use the close as the anchor point
        barLow: candle.low,
        barHigh: candle.high,
      };
    });
  }, [candleData, indicatorData]);

  // Calculate Y domain based on all price data
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    let min = Infinity;
    let max = -Infinity;
    
    chartData.forEach(d => {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (showIndicators.bollingerBands) {
        if (d.bb_lower && d.bb_lower < min) min = d.bb_lower;
        if (d.bb_upper && d.bb_upper > max) max = d.bb_upper;
      }
    });
    
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [chartData, showIndicators.bollingerBands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" data-testid="advanced-chart-modal">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-2xl">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }} data-testid="advanced-chart-title">
                {ticker} - Advanced Charts
              </CardTitle>
              <Badge variant="outline">{chartType === 'candlestick' ? 'Candlestick' : 'Line'}</Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Chart Type Toggle */}
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                  onClick={() => setChartType('candlestick')}
                  data-testid="chart-type-candlestick"
                >
                  Candlestick
                </Button>
                <Button
                  size="sm"
                  variant={chartType === 'line' ? 'default' : 'ghost'}
                  onClick={() => setChartType('line')}
                  data-testid="chart-type-line"
                >
                  Line
                </Button>
              </div>
              
              {/* Period Tabs */}
              <Tabs value={period} onValueChange={setPeriod}>
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="1mo" data-testid="adv-period-1mo">1M</TabsTrigger>
                  <TabsTrigger value="3mo" data-testid="adv-period-3mo">3M</TabsTrigger>
                  <TabsTrigger value="6mo" data-testid="adv-period-6mo">6M</TabsTrigger>
                  <TabsTrigger value="1y" data-testid="adv-period-1y">1Y</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button variant="ghost" onClick={onClose} data-testid="close-advanced-chart">
                ✕
              </Button>
            </div>
          </div>
          
          {/* Indicator Toggles */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground mr-2">Overlays:</span>
            <Button
              size="sm"
              variant={showIndicators.sma20 ? 'default' : 'outline'}
              onClick={() => setShowIndicators(prev => ({ ...prev, sma20: !prev.sma20 }))}
              className="h-7 text-xs"
              data-testid="toggle-sma20"
            >
              SMA 20
            </Button>
            <Button
              size="sm"
              variant={showIndicators.sma50 ? 'default' : 'outline'}
              onClick={() => setShowIndicators(prev => ({ ...prev, sma50: !prev.sma50 }))}
              className="h-7 text-xs"
              data-testid="toggle-sma50"
            >
              SMA 50
            </Button>
            <Button
              size="sm"
              variant={showIndicators.ema20 ? 'default' : 'outline'}
              onClick={() => setShowIndicators(prev => ({ ...prev, ema20: !prev.ema20 }))}
              className="h-7 text-xs"
              data-testid="toggle-ema20"
            >
              EMA 20
            </Button>
            <Button
              size="sm"
              variant={showIndicators.bollingerBands ? 'default' : 'outline'}
              onClick={() => setShowIndicators(prev => ({ ...prev, bollingerBands: !prev.bollingerBands }))}
              className="h-7 text-xs"
              data-testid="toggle-bb"
            >
              Bollinger Bands
            </Button>
            <span className="text-sm text-muted-foreground ml-4 mr-2">Indicators:</span>
            <Button
              size="sm"
              variant={showRSI ? 'default' : 'outline'}
              onClick={() => setShowRSI(!showRSI)}
              className="h-7 text-xs"
              data-testid="toggle-rsi"
            >
              RSI
            </Button>
            <Button
              size="sm"
              variant={showMACD ? 'default' : 'outline'}
              onClick={() => setShowMACD(!showMACD)}
              className="h-7 text-xs"
              data-testid="toggle-macd"
            >
              MACD
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center h-[400px]">
              <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Price Chart */}
              <div className="h-[350px]" data-testid="main-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={formatXAxisTick}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis
                      yAxisId="price"
                      domain={yDomain}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      tickFormatter={(val) => `$${val.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => {
                        if (value === null || value === undefined) return ['-', name];
                        if (name === 'barValue') return null;
                        return [`$${parseFloat(value).toFixed(2)}`, name];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    
                    {/* Bollinger Bands */}
                    {showIndicators.bollingerBands && (
                      <>
                        <Area
                          yAxisId="price"
                          type="monotone"
                          dataKey="bb_upper"
                          stroke="transparent"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.1}
                          name="BB Upper"
                        />
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="bb_upper"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          dot={false}
                          name="BB Upper"
                        />
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="bb_lower"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          dot={false}
                          name="BB Lower"
                        />
                      </>
                    )}
                    
                    {/* Candlestick or Line Chart */}
                    {chartType === 'candlestick' ? (
                      <>
                        {/* Draw wicks (high-low lines) */}
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="high"
                          stroke="transparent"
                          strokeWidth={0}
                          dot={false}
                          name="High"
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="low"
                          stroke="transparent"
                          strokeWidth={0}
                          dot={false}
                          name="Low"
                          isAnimationActive={false}
                        />
                        {/* Bodies as bars from open to close */}
                        <Bar
                          yAxisId="price"
                          dataKey="close"
                          barSize={6}
                          isAnimationActive={false}
                          name="Close"
                        >
                          {chartData.map((entry, index) => {
                            const isGreen = entry.close >= entry.open;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isGreen ? '#22c55e' : '#ef4444'}
                              />
                            );
                          })}
                        </Bar>
                        {/* Open for tooltip */}
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="open"
                          stroke="transparent"
                          strokeWidth={0}
                          dot={false}
                          name="Open"
                          isAnimationActive={false}
                        />
                      </>
                    ) : (
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="close"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Close"
                      />
                    )}
                    
                    {/* Moving Averages */}
                    {showIndicators.sma20 && (
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="sma_20"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        dot={false}
                        name="SMA 20"
                      />
                    )}
                    {showIndicators.sma50 && (
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="sma_50"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={false}
                        name="SMA 50"
                      />
                    )}
                    {showIndicators.ema20 && (
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="ema_20"
                        stroke="#ec4899"
                        strokeWidth={1.5}
                        dot={false}
                        name="EMA 20"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Chart */}
              <div className="h-[80px] border-t border-border/50 pt-2" data-testid="volume-chart">
                <div className="text-xs text-muted-foreground mb-1 font-semibold">Volume</div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis 
                      hide 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(value) => [value?.toLocaleString() || '-', 'Volume']}
                    />
                    <Bar dataKey="volume" isAnimationActive={false}>
                      {chartData.map((entry, index) => {
                        const isGreen = entry.close >= entry.open;
                        return (
                          <Cell
                            key={`vol-${index}`}
                            fill={isGreen ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}
                          />
                        );
                      })}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* RSI Chart */}
              {showRSI && (
                <div className="h-[120px] border-t border-border/50 pt-4" data-testid="rsi-chart">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">RSI (14)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis
                        domain={[0, 100]}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        ticks={[30, 50, 70]}
                        width={30}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(value) => value ? [value.toFixed(2), 'RSI'] : ['-', 'RSI']}
                      />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.05} />
                      <ReferenceArea y1={0} y2={30} fill="#22c55e" fillOpacity={0.05} />
                      <Area
                        type="monotone"
                        dataKey="rsi"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.2}
                        strokeWidth={1.5}
                        name="RSI"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* MACD Chart */}
              {showMACD && (
                <div className="h-[140px] border-t border-border/50 pt-4" data-testid="macd-chart">
                  <div className="text-xs text-muted-foreground mb-2 font-semibold">MACD (12, 26, 9)</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        width={40}
                        tickFormatter={(val) => val.toFixed(1)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(value, name) => value ? [value.toFixed(3), name] : ['-', name]}
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Bar dataKey="macd_histogram" name="Histogram" isAnimationActive={false}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`macd-${index}`}
                            fill={entry.macd_histogram >= 0 ? '#22c55e' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                      <Line
                        type="monotone"
                        dataKey="macd"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={false}
                        name="MACD"
                      />
                      <Line
                        type="monotone"
                        dataKey="macd_signal"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        dot={false}
                        name="Signal"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                  <span className="text-muted-foreground">Bullish (Close ≥ Open)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                  <span className="text-muted-foreground">Bearish (Close &lt; Open)</span>
                </div>
                {showIndicators.sma20 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#f59e0b]" />
                    <span className="text-muted-foreground">SMA 20</span>
                  </div>
                )}
                {showIndicators.sma50 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#3b82f6]" />
                    <span className="text-muted-foreground">SMA 50</span>
                  </div>
                )}
                {showIndicators.ema20 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#ec4899]" />
                    <span className="text-muted-foreground">EMA 20</span>
                  </div>
                )}
                {showRSI && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">RSI: &gt;70 Overbought, &lt;30 Oversold</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedChart;
