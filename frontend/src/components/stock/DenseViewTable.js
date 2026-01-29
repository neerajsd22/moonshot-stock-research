import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, X } from 'lucide-react';

const DenseViewTable = ({ 
  stackedStocks, 
  maxStocks, 
  onExpand, 
  onDismiss,
  getCurrencySymbol 
}) => {
  return (
    <div className="fade-in" data-testid="dense-view-container">
      <Card className="premium-card gold-gradient-border overflow-hidden">
        <CardHeader className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
              Expand
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="dense-stocks-table">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                  <th className="text-left p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ticker</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Change</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day Open</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day High</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Day Low</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Cap</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">P/E</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">52W High</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">52W Low</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Volume</th>
                  <th className="text-center p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stackedStocks.map((stock) => (
                  <tr 
                    key={stock.ticker} 
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    data-testid={`dense-row-${stock.ticker}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white" style={{ fontFamily: 'DM Mono, monospace' }}>{stock.ticker}</span>
                        <span className="text-xs text-gray-500 hidden lg:inline truncate max-w-[120px]">{stock.quote.company_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-semibold text-white mono-numbers">
                        {getCurrencySymbol(stock.ticker, stock.quote.currency)}{stock.quote.price?.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-medium mono-numbers ${stock.quote.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.quote.change >= 0 ? '+' : ''}{stock.quote.change?.toFixed(2)} ({stock.quote.change_percent?.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.day_open ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_open.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.day_high ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_high.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.day_low ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.day_low.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.market_cap ? `$${(stock.quote.market_cap / 1e9).toFixed(2)}B` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.pe_ratio ? stock.quote.pe_ratio.toFixed(2) : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.high_52week ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.high_52week.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.low_52week ? `${getCurrencySymbol(stock.ticker, stock.quote.currency)}${stock.quote.low_52week.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-right text-gray-300 mono-numbers">
                      {stock.quote.volume ? `${(stock.quote.volume / 1e6).toFixed(2)}M` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDismiss(stock.ticker)}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        data-testid={`dense-dismiss-${stock.ticker}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DenseViewTable;
