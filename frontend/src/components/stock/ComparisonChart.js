import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

const COLORS = [
  '#d946ef', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316',
];

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ComparisonChart = ({ stocks, onClose, period = '1y' }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [normalizeData, setNormalizeData] = useState(true);

  useEffect(() => {
    const fetchComparisonData = async () => {
      if (stocks.length === 0) return;
      setLoading(true);
      try {
        const promises = stocks.map(stock => 
          axios.get(`${API}/stocks/${stock.ticker}/history`, { params: { period } })
        );
        const responses = await Promise.all(promises);
        const dataMap = new Map();
        
        responses.forEach((response, idx) => {
          const ticker = stocks[idx].ticker;
          const data = response.data;
          const firstPrice = data[0]?.close || 1;
          
          data.forEach(point => {
            const existing = dataMap.get(point.date) || { date: point.date };
            existing[ticker] = normalizeData 
              ? ((point.close / firstPrice) - 1) * 100 
              : point.close;
            dataMap.set(point.date, existing);
          });
        });
        
        const mergedData = Array.from(dataMap.values())
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setChartData(mergedData);
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchComparisonData();
  }, [stocks, period, normalizeData]);

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const formatValue = useCallback((value) => {
    if (normalizeData) {
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }
    return `$${value.toFixed(2)}`;
  }, [normalizeData]);

  const exportToCSV = () => {
    if (chartData.length === 0) return;
    const headers = ['Date', ...stocks.map(s => s.ticker)];
    const rows = chartData.map(row => [row.date, ...stocks.map(s => row[s.ticker]?.toFixed(2) || '')]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_comparison_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 shadow-xl">
          <p className="text-xs text-gray-400 mb-2">{formatDate(label)}</p>
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.dataKey}</span>
              </div>
              <span className={`font-mono ${entry.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="premium-card gold-gradient-border" data-testid="comparison-chart">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-[#d946ef]" />
            <CardTitle className="text-lg text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Stock Comparison
            </CardTitle>
            <Badge variant="outline" className="text-xs text-gray-400">{stocks.length} stocks</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNormalizeData(!normalizeData)}
              className={`text-xs ${normalizeData ? 'bg-[#d946ef]/20 border-[#d946ef]/50 text-[#d946ef]' : 'btn-outline-gold'}`}
              data-testid="normalize-toggle"
            >
              {normalizeData ? '% Change' : 'Price'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="btn-outline-gold" data-testid="export-comparison-csv">
              <Download className="w-3 h-3 mr-1" />CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white" data-testid="close-comparison">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {stocks.map((stock, idx) => (
            <div key={stock.ticker} className="flex items-center gap-1.5 px-2 py-1 bg-[rgba(255,255,255,0.03)] rounded">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="text-xs text-gray-300 font-medium">{stock.ticker}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} tickFormatter={(v) => normalizeData ? `${v.toFixed(0)}%` : `$${v}`} />
                <Tooltip content={renderTooltip} />
                {stocks.map((stock, idx) => (
                  <Line key={stock.ticker} type="monotone" dataKey={stock.ticker} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
        )}
        {normalizeData && <p className="text-xs text-gray-500 mt-3 text-center">Showing percentage change from start of period</p>}
      </CardContent>
    </Card>
  );
};

export default ComparisonChart;
