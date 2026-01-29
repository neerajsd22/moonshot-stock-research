import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const ExportButton = ({ stocks, className = '' }) => {
  const exportToCSV = () => {
    if (!stocks || stocks.length === 0) {
      toast.error('No stocks to export');
      return;
    }

    // Define CSV headers
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
    ];

    // Build rows from stock data
    const rows = stocks.map(stock => {
      const q = stock.quote;
      return [
        stock.ticker,
        `"${q.company_name || ''}"`, // Quote to handle commas
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

    toast.success(`Exported ${stocks.length} stocks to CSV`);
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
