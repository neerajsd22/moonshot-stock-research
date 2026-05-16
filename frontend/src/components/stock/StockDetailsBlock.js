import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, ExternalLink, RefreshCw } from 'lucide-react';
import IntelligenceHub from '../IntelligenceHub';
import { ResearchAnalysis } from './index';

/**
 * Detail sections (Financials, Analysis, Latest News, Intelligence Hub, AI Deep Analysis)
 * rendered for a single stacked stock. Reads all data off the provided `stock` object,
 * so it can be reused per-stock in the stacked list rather than only the latest one.
 */
const StockDetailsBlock = ({ stock, onRefreshHealth, isRefreshing }) => {
  const earningsLink = stock.earningsLink;
  const earningsSnapshot = stock.earningsSnapshot;
  const bullBearSentiment = stock.bullBearSentiment;
  const newsArticles = stock.newsArticles || [];
  const healthReport = stock.healthReport;

  return (
    <div className="mt-4 space-y-4 fade-in" data-testid={`stock-details-block-${stock.ticker}`}>
      {/* Financials, Analysis & News - 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Column 1: Financials Section */}
        <Card className="premium-card gold-gradient-border h-fit">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {earningsLink ? (
              <div className="space-y-3">
                <a
                  data-testid={`earnings-link-${stock.ticker}`}
                  href={earningsLink.earnings_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#d946ef] hover:text-[#f0abfc] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">View Earnings Report</span>
                </a>

                {/* Earnings Snapshot */}
                <div className="pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <div className="text-xs font-semibold mb-2 text-white flex items-center gap-2">
                    <span>📊</span> Earnings Snapshot
                  </div>
                  {earningsSnapshot ? (
                    <div className="grid grid-cols-2 gap-2">
                      {earningsSnapshot.capex && (
                        <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                          <div className="text-[10px] text-gray-400">CapEx</div>
                          <div className="text-xs font-semibold text-white mono-numbers">
                            ${(Math.abs(earningsSnapshot.capex) / 1e9).toFixed(2)}B
                          </div>
                        </div>
                      )}
                      {earningsSnapshot.free_cash_flow && (
                        <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                          <div className="text-xs text-gray-400">Free Cash Flow</div>
                          <div className={`text-sm font-semibold mono-numbers ${earningsSnapshot.free_cash_flow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${(earningsSnapshot.free_cash_flow / 1e9).toFixed(2)}B
                          </div>
                        </div>
                      )}
                      {earningsSnapshot.gross_margin && (
                        <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                          <div className="text-xs text-gray-400">Gross Margin</div>
                          <div className="text-sm font-semibold text-white mono-numbers">
                            {earningsSnapshot.gross_margin.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {earningsSnapshot.return_on_equity && (
                        <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                          <div className="text-xs text-gray-400">ROE</div>
                          <div className={`text-sm font-semibold mono-numbers ${earningsSnapshot.return_on_equity >= 15 ? 'text-green-400' : 'text-white'}`}>
                            {earningsSnapshot.return_on_equity.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {earningsSnapshot.target_price && (
                        <div className="p-2 bg-[rgba(255,255,255,0.02)] rounded-lg">
                          <div className="text-xs text-gray-400">Target</div>
                          <div className="text-sm font-semibold text-[#d946ef] mono-numbers">
                            ${earningsSnapshot.target_price.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Loading...</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Loading financial data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 2: Analysis Section */}
        <Card className="premium-card gold-gradient-border h-fit">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div data-testid={`bull-bear-sentiment-${stock.ticker}`}>
              <div className="text-xs font-semibold mb-2 text-white">Bull vs Bear Sentiment</div>
              {bullBearSentiment ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-medium text-green-400 mb-1.5 flex items-center gap-1">
                      📈 Bull Case
                    </div>
                    <ul className="space-y-1">
                      {(bullBearSentiment.bull_points || []).map((point, idx) => (
                        <li key={idx} className="text-[11px] text-gray-400 flex gap-2">
                          <span className="text-green-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-red-400 mb-1.5 flex items-center gap-1">
                      📉 Bear Case
                    </div>
                    <ul className="space-y-1">
                      {(bullBearSentiment.bear_points || []).map((point, idx) => (
                        <li key={idx} className="text-[11px] text-gray-400 flex gap-2">
                          <span className="text-red-400">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400">Loading sentiment analysis...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Latest News */}
        <Card className="premium-card gold-gradient-border h-fit">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Latest News
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {newsArticles.length > 0 ? (
              <div className="space-y-2 stagger-children">
                {newsArticles.map((article, index) => (
                  <a
                    key={index}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2 p-2 rounded-lg news-card transition-all duration-300 group"
                    data-testid={`news-article-${stock.ticker}-${index}`}
                  >
                    {article.thumbnail && (
                      <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[11px] text-white group-hover:text-[#d946ef] transition-colors line-clamp-2 mb-0.5">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="truncate">{article.publisher}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                No news available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intelligence Hub */}
      <IntelligenceHub ticker={stock.ticker} />

      {/* AI Deep Analysis */}
      <Card className="premium-card gold-gradient-border" data-testid={`ai-deep-analysis-${stock.ticker}`}>
        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <CardTitle className="text-xs sm:text-sm font-semibold text-white section-title-gold flex items-center gap-1.5 sm:gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <BrainCircuit className="w-4 h-4 text-[#d946ef] flex-shrink-0" />
                <span className="truncate">AI Deep Analysis</span>
              </CardTitle>
              {healthReport && healthReport.verdict && (
                <Badge
                  className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 flex-shrink-0 ${
                    healthReport.verdict === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    healthReport.verdict === 'HOLD' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {healthReport.verdict} ({healthReport.score}/10)
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefreshHealth(stock.ticker)}
              disabled={isRefreshing}
              className="flex items-center gap-1 sm:gap-2 btn-outline-gold flex-shrink-0"
              data-testid={`refresh-ai-analysis-${stock.ticker}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
          {healthReport && healthReport.audit_date && (
            <p className="text-xs text-gray-500 mt-1">
              Audit Date: {healthReport.audit_date} • {healthReport.company_name}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {healthReport && healthReport.quarters && healthReport.quarters.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Core Vitals Matrix */}
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#d946ef] rounded-full"></span>
                  Core Vitals Matrix
                </h4>
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.1)]">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Metric</th>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <th key={i} className="text-right py-2 px-2 text-gray-400 font-medium text-xs">
                            {q.quarter}
                          </th>
                        ))}
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        <td className="py-2 px-3 text-gray-300">Revenue</td>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                            {q.revenue ? `$${(q.revenue / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className={`py-2 px-3 ${healthReport.trends?.revenue_trend === 'accelerating' ? 'text-green-400' : 'text-red-400'}`}>
                          {healthReport.trends?.revenue_trend === 'accelerating' ? '📈 Accelerating' : '📉 Slowing'}
                        </td>
                      </tr>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        <td className="py-2 px-3 text-gray-300">Gross Margin</td>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                            {q.gross_margin ? `${q.gross_margin}%` : '-'}
                          </td>
                        ))}
                        <td className={`py-2 px-3 ${healthReport.trends?.margin_trend === 'improving' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {healthReport.trends?.margin_trend === 'improving' ? '✓ Strong Moat' : '⚠ Monitor'}
                        </td>
                      </tr>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        <td className="py-2 px-3 text-gray-300">Op. Margin</td>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <td key={i} className="text-right py-2 px-2 text-white mono-numbers">
                            {q.op_margin ? `${q.op_margin}%` : '-'}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-gray-400">Efficiency</td>
                      </tr>
                      <tr className="border-b border-[rgba(255,255,255,0.05)]">
                        <td className="py-2 px-3 text-gray-300">Net Income</td>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <td key={i} className={`text-right py-2 px-2 mono-numbers ${q.net_income >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {q.net_income ? `$${(q.net_income / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-gray-400">Profitability</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-300">FCF</td>
                        {healthReport.quarters.slice(0, 8).map((q, i) => (
                          <td key={i} className={`text-right py-2 px-2 mono-numbers ${q.fcf >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {q.fcf ? `$${(q.fcf / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className={`py-2 px-3 ${healthReport.trends?.fcf_quality === 'strong' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {healthReport.trends?.fcf_quality === 'strong' ? '✓ Strong' : healthReport.trends?.fcf_quality === 'moderate' ? '⚠ Moderate' : '✗ Weak'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key Metrics & Risk Assessment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <h5 className="text-sm font-semibold text-white mb-3">Key Metrics</h5>
                  <div className="space-y-2">
                    {healthReport.current_metrics?.pe_ratio && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Forward P/E</span>
                        <span className="text-xs text-white mono-numbers">{healthReport.current_metrics.pe_ratio.toFixed(1)}</span>
                      </div>
                    )}
                    {healthReport.current_metrics?.roe && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">ROE</span>
                        <span className={`text-xs mono-numbers ${healthReport.current_metrics.roe >= 15 ? 'text-green-400' : 'text-white'}`}>
                          {healthReport.current_metrics.roe.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {healthReport.current_metrics?.debt_to_equity && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Debt/Equity</span>
                        <span className={`text-xs mono-numbers ${healthReport.current_metrics.debt_to_equity < 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {healthReport.current_metrics.debt_to_equity.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    {healthReport.current_metrics?.revenue_growth && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Rev Growth</span>
                        <span className={`text-xs mono-numbers ${healthReport.current_metrics.revenue_growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {healthReport.current_metrics.revenue_growth.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <h5 className="text-sm font-semibold text-white mb-3">Risk Scorecard</h5>
                  <div className="space-y-2">
                    {[
                      ['Regulatory Risk', healthReport.risk_scores?.regulatory_risk],
                      ['Concentration Risk', healthReport.risk_scores?.concentration_risk],
                      ['Debt Risk', healthReport.risk_scores?.debt_risk],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{label}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${val <= 3 ? 'bg-green-400' : val <= 6 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              style={{ width: `${(val || 0) * 10}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6">{val}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <h5 className="text-sm font-semibold text-white mb-3">Sentiment</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Institutional</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          healthReport.sentiment?.institutional === 'bullish' ? 'text-green-400 border-green-400/30' :
                          healthReport.sentiment?.institutional === 'bearish' ? 'text-red-400 border-red-400/30' :
                          'text-gray-400 border-gray-400/30'
                        }`}
                      >
                        {healthReport.sentiment?.institutional || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Analyst</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          healthReport.sentiment?.analyst === 'bullish' ? 'text-green-400 border-green-400/30' :
                          healthReport.sentiment?.analyst === 'bearish' ? 'text-red-400 border-red-400/30' :
                          'text-gray-400 border-gray-400/30'
                        }`}
                      >
                        {healthReport.sentiment?.analyst || 'N/A'}
                      </Badge>
                    </div>
                    {healthReport.current_metrics?.held_by_institutions && (
                      <div className="flex justify-between items-center pt-2 border-t border-[rgba(255,255,255,0.05)]">
                        <span className="text-xs text-gray-400">Inst. Ownership</span>
                        <span className="text-xs text-white mono-numbers">{healthReport.current_metrics.held_by_institutions.toFixed(1)}%</span>
                      </div>
                    )}
                    {healthReport.current_metrics?.target_price && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Target Price</span>
                        <span className="text-xs text-[#d946ef] mono-numbers">${healthReport.current_metrics.target_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Final Verdict Summary */}
              <div className={`p-4 rounded-lg border ${
                healthReport.verdict === 'BUY' ? 'bg-green-500/10 border-green-500/30' :
                healthReport.verdict === 'HOLD' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`text-3xl ${
                    healthReport.verdict === 'BUY' ? 'text-green-400' :
                    healthReport.verdict === 'HOLD' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {healthReport.verdict === 'BUY' ? '✓' : healthReport.verdict === 'HOLD' ? '⚡' : '✗'}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-semibold text-white mb-1">Analyst Verdict: {healthReport.verdict}</h5>
                    <p className="text-xs text-gray-400">
                      Based on 8-quarter trend analysis, {healthReport.company_name} shows
                      {healthReport.trends?.revenue_trend === 'accelerating' ? ' accelerating revenue growth' : ' slowing revenue'},
                      {healthReport.trends?.margin_trend === 'improving' ? ' improving margins' : ' margin pressure'}, and
                      {healthReport.trends?.fcf_quality === 'strong' ? ' strong cash flow generation' : ' moderate cash flow'}.
                      {healthReport.sentiment?.analyst === 'bullish' ? ' Analysts remain bullish' : healthReport.sentiment?.analyst === 'bearish' ? ' Analysts are cautious' : ' Mixed analyst sentiment'}
                      with a target price of ${healthReport.current_metrics?.target_price?.toFixed(2) || 'N/A'}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isRefreshing || healthReport === undefined ? (
            <ResearchAnalysis />
          ) : healthReport && healthReport._failed ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-4xl mb-4">📊</span>
              <p className="text-sm text-gray-400">Unable to load AI analysis for this stock.</p>
              <p className="text-xs text-gray-500 mt-1">{healthReport.message || 'Financial data may not be available.'}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefreshHealth(stock.ticker)}
                disabled={isRefreshing}
                className="mt-4 btn-outline-gold"
                data-testid={`retry-ai-analysis-${stock.ticker}`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="text-4xl mb-4">📊</span>
              <p className="text-sm text-gray-400">Unable to load AI analysis for this stock.</p>
              <p className="text-xs text-gray-500 mt-1">Financial data may not be available.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefreshHealth(stock.ticker)}
                disabled={isRefreshing}
                className="mt-4 btn-outline-gold"
                data-testid={`retry-ai-analysis-fallback-${stock.ticker}`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Retrying...' : 'Retry'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockDetailsBlock;
