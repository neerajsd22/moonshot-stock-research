import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

const FinancialsCard = ({ 
  stockQuote, 
  earningsLink, 
  earningsSnapshot, 
  loadingEarningsSnapshot,
  getCurrencySymbol 
}) => {
  const ticker = stockQuote?.ticker;
  
  return (
    <Card className="premium-card gold-gradient-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white section-title-gold flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Financials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Earnings Snapshot */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#d946ef] flex items-center gap-2">
            <span>📊</span> Earnings Snapshot
          </h4>
          {loadingEarningsSnapshot ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-3/4"></div>
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-1/2"></div>
            </div>
          ) : earningsSnapshot ? (
            <div className="grid grid-cols-2 gap-3">
              {earningsSnapshot.capex !== null && earningsSnapshot.capex !== undefined && (
                <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                  <div className="text-xs text-gray-500">CapEx</div>
                  <div className="text-sm font-medium text-white mono-numbers">
                    ${(earningsSnapshot.capex / 1e9).toFixed(2)}B
                  </div>
                </div>
              )}
              {earningsSnapshot.fcf !== null && earningsSnapshot.fcf !== undefined && (
                <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                  <div className="text-xs text-gray-500">Free Cash Flow</div>
                  <div className="text-sm font-medium text-white mono-numbers">
                    ${(earningsSnapshot.fcf / 1e9).toFixed(2)}B
                  </div>
                </div>
              )}
              {earningsSnapshot.gross_margin !== null && earningsSnapshot.gross_margin !== undefined && (
                <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                  <div className="text-xs text-gray-500">Gross Margin</div>
                  <div className="text-sm font-medium text-white mono-numbers">
                    {(earningsSnapshot.gross_margin * 100).toFixed(1)}%
                  </div>
                </div>
              )}
              {earningsSnapshot.roe !== null && earningsSnapshot.roe !== undefined && (
                <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                  <div className="text-xs text-gray-500">Return on Equity</div>
                  <div className="text-sm font-medium text-white mono-numbers">
                    {(earningsSnapshot.roe * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Earnings data not available</p>
          )}
        </div>
        
        {/* Earnings Link */}
        {earningsLink && (
          <a
            href={earningsLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#d946ef] hover:text-[#f0abfc] transition-colors"
            data-testid="earnings-link"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Earnings Report
          </a>
        )}
        
        {/* Key Financial Metrics */}
        <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <h4 className="text-sm font-medium text-gray-400">Key Metrics</h4>
          <div className="space-y-1">
            {stockQuote?.market_cap && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Market Cap</span>
                <span className="text-white mono-numbers">${(stockQuote.market_cap / 1e9).toFixed(2)}B</span>
              </div>
            )}
            {stockQuote?.pe_ratio && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">P/E Ratio</span>
                <span className="text-white mono-numbers">{stockQuote.pe_ratio.toFixed(2)}</span>
              </div>
            )}
            {stockQuote?.dividend_yield !== null && stockQuote?.dividend_yield !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dividend Yield</span>
                <span className="text-white mono-numbers">{stockQuote.dividend_yield.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialsCard;
