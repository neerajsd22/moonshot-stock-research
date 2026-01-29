import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const ExportButton = ({ stocks, className = '' }) => {
  const exportToCSV = () => {
    if (!stocks || stocks.length === 0) {
      toast.error('No stocks to export');
      return;
    }

    // Define CSV headers - includes basic info + AI Deep Analysis
    const headers = [
      'Ticker',
      'Company',
      'Price',
      'Change',
      'Change %',
      'Day Open',
      'Day High',
      'Day Low',
      'Market Cap',
      'P/E Ratio',
      'Dividend Yield',
      '52W High',
      '52W Low',
      'Volume',
      // AI Deep Analysis fields
      'AI Verdict',
      'AI Score',
      'Revenue Trend',
      'Margin Trend',
      'FCF Quality',
      'ROE',
      'Debt/Equity',
      'Inst. Ownership',
      'Target Price',
      'Analyst Sentiment',
      'Latest Revenue (Q)',
      'Latest Gross Margin (Q)',
      'Latest Op Margin (Q)',
      'Latest Net Income (Q)',
      'Latest FCF (Q)',
    ];

    // Build rows from stock data
    const rows = stocks.map(stock => {
      const q = stock.quote;
      const h = stock.healthReport || {};
      const metrics = h.current_metrics || {};
      const trends = h.trends || {};
      const sentiment = h.sentiment || {};
      const latestQ = h.quarters?.[0] || {};

      return [
        stock.ticker,
        `"${q.company_name || ''}"`,
        q.price?.toFixed(2) || '',
        q.change?.toFixed(2) || '',
        q.change_percent?.toFixed(2) || '',
        q.day_open?.toFixed(2) || '',
        q.day_high?.toFixed(2) || '',
        q.day_low?.toFixed(2) || '',
        q.market_cap ? (q.market_cap / 1e9).toFixed(2) + 'B' : '',
        q.pe_ratio?.toFixed(2) || '',
        q.dividend_yield?.toFixed(2) || '',
        q.high_52week?.toFixed(2) || '',
        q.low_52week?.toFixed(2) || '',
        q.volume ? (q.volume / 1e6).toFixed(2) + 'M' : '',
        // AI Deep Analysis
        h.verdict || '',
        h.score || '',
        trends.revenue_trend || '',
        trends.margin_trend || '',
        trends.fcf_quality || '',
        metrics.roe ? metrics.roe.toFixed(1) + '%' : '',
        metrics.debt_to_equity?.toFixed(1) || '',
        metrics.held_by_institutions ? metrics.held_by_institutions.toFixed(1) + '%' : '',
        metrics.target_price ? '$' + metrics.target_price.toFixed(2) : '',
        sentiment.analyst || '',
        latestQ.revenue ? '$' + (latestQ.revenue / 1e9).toFixed(2) + 'B' : '',
        latestQ.gross_margin ? latestQ.gross_margin.toFixed(1) + '%' : '',
        latestQ.op_margin ? latestQ.op_margin.toFixed(1) + '%' : '',
        latestQ.net_income ? '$' + (latestQ.net_income / 1e9).toFixed(2) + 'B' : '',
        latestQ.fcf ? '$' + (latestQ.fcf / 1e9).toFixed(2) + 'B' : '',
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moonshot_stocks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${stocks.length} stocks with AI analysis to CSV`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      className={`flex items-center gap-2 btn-outline-gold ${className}`}
      data-testid="export-csv-button"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Export CSV</span>
    </Button>
  );
};

export default ExportButton;
