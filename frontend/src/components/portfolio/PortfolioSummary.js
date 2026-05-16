import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { fmtUSD, fmtPct, fmtSigned, colorClass } from './api';

const PortfolioSummary = ({ summary, onAdd, onImport }) => {
  if (!summary || summary.is_empty) return null;

  const topAllocation = (summary.allocation || []).slice(0, 5);

  return (
    <Card className="premium-card gold-gradient-border" data-testid="portfolio-summary-card">
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div data-testid="summary-total-value">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Value</div>
            <div className="text-2xl sm:text-3xl font-bold text-white mono-numbers">
              {fmtUSD(summary.total_value)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Cost basis: {fmtUSD(summary.total_cost)}
            </div>
          </div>

          <div data-testid="summary-today">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Today</div>
            <div className={`text-2xl sm:text-3xl font-bold mono-numbers ${colorClass(summary.today_change)}`}>
              {fmtSigned(summary.today_change)}
            </div>
            <div className={`text-xs mt-1 mono-numbers ${colorClass(summary.today_change)}`}>
              {fmtPct(summary.today_change_pct)}
            </div>
          </div>

          <div data-testid="summary-total-pnl">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total P&amp;L</div>
            <div className={`text-2xl sm:text-3xl font-bold mono-numbers ${colorClass(summary.total_pnl)}`}>
              {fmtSigned(summary.total_pnl)}
            </div>
            <div className={`text-xs mt-1 mono-numbers ${colorClass(summary.total_pnl)}`}>
              {fmtPct(summary.total_pnl_pct)}
            </div>
            {summary.sp500_return_pct !== null && summary.sp500_return_pct !== undefined && (
              <div
                className="text-[11px] mt-1.5 flex flex-wrap items-center gap-1.5"
                data-testid="summary-vs-sp500"
                title={`Cost-weighted S&P 500 return over your holding periods. As of ${summary.sp500_as_of || ''}`}
              >
                <span className={`mono-numbers ${colorClass(summary.total_pnl_pct)}`}>
                  {fmtPct(summary.total_pnl_pct)}
                </span>
                <span className="text-gray-500">vs</span>
                <span className={`mono-numbers ${colorClass(summary.sp500_return_pct)}`}>
                  {fmtPct(summary.sp500_return_pct)}
                </span>
                <span className="text-gray-500">S&amp;P 500</span>
                {summary.sp500_diff_pct !== null && summary.sp500_diff_pct !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold mono-numbers border ${
                      summary.sp500_diff_pct >= 0
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {summary.sp500_diff_pct >= 0 ? '↑ beating' : '↓ trailing'} by {Math.abs(summary.sp500_diff_pct).toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Best/Worst chips */}
        {(summary.best_performer || summary.worst_performer) && (
          <div className="flex flex-wrap gap-2">
            {summary.best_performer && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                (summary.best_performer.unrealized_pnl_pct ?? 0) >= 0
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <TrendingUp className={`w-3 h-3 ${(summary.best_performer.unrealized_pnl_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-gray-400">Best:</span>
                <span className="text-white font-semibold">{summary.best_performer.ticker}</span>
                <span className={`mono-numbers ${colorClass(summary.best_performer.unrealized_pnl_pct)}`}>
                  {fmtPct(summary.best_performer.unrealized_pnl_pct)}
                </span>
              </div>
            )}
            {summary.worst_performer && summary.worst_performer.ticker !== summary.best_performer?.ticker && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                (summary.worst_performer.unrealized_pnl_pct ?? 0) >= 0
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <TrendingDown className={`w-3 h-3 ${(summary.worst_performer.unrealized_pnl_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-gray-400">Worst:</span>
                <span className="text-white font-semibold">{summary.worst_performer.ticker}</span>
                <span className={`mono-numbers ${colorClass(summary.worst_performer.unrealized_pnl_pct)}`}>
                  {fmtPct(summary.worst_performer.unrealized_pnl_pct)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Allocation strip */}
        {topAllocation.length > 0 && (
          <div data-testid="summary-allocation">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Allocation</div>
            <div className="flex h-2 rounded-full overflow-hidden bg-[rgba(255,255,255,0.04)]">
              {topAllocation.map((a, i) => {
                const colors = ['#d946ef', '#a855f7', '#22d3ee', '#22c55e', '#f59e0b'];
                return (
                  <div
                    key={a.ticker}
                    title={`${a.ticker} · ${a.percent.toFixed(1)}%`}
                    style={{ width: `${a.percent}%`, backgroundColor: colors[i % colors.length] }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {topAllocation.map((a, i) => {
                const colors = ['#d946ef', '#a855f7', '#22d3ee', '#22c55e', '#f59e0b'];
                return (
                  <span key={a.ticker} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-gray-300 font-semibold">{a.ticker}</span>
                    <span className="text-gray-500">{a.percent.toFixed(1)}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={onAdd} className="bg-[#d946ef] hover:bg-[#f0abfc] text-[#0a0a0f] font-semibold gap-1.5" data-testid="summary-add-button">
            <Plus className="w-4 h-4" /> Add Position
          </Button>
          <Button variant="outline" onClick={onImport} className="gap-1.5" data-testid="summary-import-button">
            <Upload className="w-4 h-4" /> Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary;
