import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Check, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fmtUSD, fmtPct, fmtSigned, colorClass, portfolioApi } from './api';

const PositionCard = ({ position, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [shares, setShares] = useState(position.shares);
  const [avgCost, setAvgCost] = useState(position.avg_cost);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await portfolioApi.update(position.id, {
        shares: parseFloat(shares),
        avg_cost: parseFloat(avgCost),
      });
      toast.success(`${position.ticker} updated`);
      setEditing(false);
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove ${position.ticker} from your portfolio?`)) return;
    setBusy(true);
    try {
      await portfolioApi.remove(position.id);
      toast.success(`${position.ticker} removed`);
      onChanged && onChanged();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Remove failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="premium-card gold-gradient-border" data-testid={`position-card-${position.ticker}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid={`position-ticker-${position.ticker}`}>
                {position.ticker}
              </h3>
              <span className="text-xs text-gray-400">{position.company_name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(217,70,239,0.1)] text-[#d946ef] border border-[rgba(217,70,239,0.2)] mono-numbers">
                {position.shares} sh
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]" data-testid={`edit-${position.ticker}`} title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleDelete} disabled={busy} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10" data-testid={`delete-${position.ticker}`} title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSave} disabled={busy} className="p-1.5 rounded text-green-400 hover:bg-green-500/10" data-testid={`save-${position.ticker}`} title="Save">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditing(false); setShares(position.shares); setAvgCost(position.avg_cost); }} className="p-1.5 rounded text-gray-400 hover:bg-[rgba(255,255,255,0.06)]" title="Cancel">
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Cost</div>
              <div className="text-sm font-semibold text-gray-300 mono-numbers">{fmtUSD(position.avg_cost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Current</div>
              <div className="text-sm font-semibold text-white mono-numbers">{fmtUSD(position.price)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Market Value</div>
              <div className="text-sm font-semibold text-white mono-numbers">{fmtUSD(position.market_value)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Today</div>
              <div className={`text-sm font-semibold mono-numbers ${colorClass(position.today_change)}`}>
                {fmtSigned(position.today_change)}
              </div>
              <div className={`text-[10px] mono-numbers ${colorClass(position.today_change)}`}>
                {fmtPct(position.today_change_pct)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Shares</label>
              <Input type="number" step="0.0001" value={shares} onChange={(e) => setShares(e.target.value)} className="bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-sm" data-testid={`edit-shares-${position.ticker}`} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1">Avg Cost</label>
              <Input type="number" step="0.01" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} className="bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-sm" data-testid={`edit-cost-${position.ticker}`} />
            </div>
          </div>
        )}

        {/* Unrealized P&L - gold-highlighted */}
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <span>✦</span> Unrealized P&amp;L
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold mono-numbers ${colorClass(position.unrealized_pnl)}`} data-testid={`pnl-${position.ticker}`}>
              {fmtSigned(position.unrealized_pnl)}
            </span>
            <span className={`text-sm mono-numbers ${colorClass(position.unrealized_pnl_pct)}`}>
              ({fmtPct(position.unrealized_pnl_pct)})
            </span>
          </div>
        </div>

        {position.dividends_ytd > 0 && (
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-gray-500">Dividends YTD</span>
            <span className="text-green-400 mono-numbers">{fmtUSD(position.dividends_ytd)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PositionCard;
