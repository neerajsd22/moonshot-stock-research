import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const KeyStatsCard = ({ stock, getCurrencySymbol }) => {
  const { quote, ticker } = stock;
  
  return (
    <Card className="premium-card gold-gradient-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Key Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
          {quote.day_open && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Day Open</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_open.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_high && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Day High</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_high.toFixed(2)}
              </div>
            </div>
          )}
          {quote.day_low && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Day Low</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.day_low.toFixed(2)}
              </div>
            </div>
          )}
          {quote.market_cap && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                ${(quote.market_cap / 1e9).toFixed(2)}B
              </div>
            </div>
          )}
          {quote.pe_ratio && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">P/E Ratio</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {quote.pe_ratio.toFixed(2)}
              </div>
            </div>
          )}
          {quote.dividend_yield !== null && quote.dividend_yield !== undefined && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Dividend</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {quote.dividend_yield.toFixed(2)}%
              </div>
            </div>
          )}
          {quote.high_52week && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">52W High</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.high_52week.toFixed(2)}
              </div>
            </div>
          )}
          {quote.low_52week && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">52W Low</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {getCurrencySymbol(ticker, quote.currency)}{quote.low_52week.toFixed(2)}
              </div>
            </div>
          )}
          {quote.volume && (
            <div className="stat-item">
              <div className="text-sm text-gray-400">Volume</div>
              <div className="text-base font-semibold mt-1 text-white mono-numbers">
                {(quote.volume / 1e6).toFixed(2)}M
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KeyStatsCard;
