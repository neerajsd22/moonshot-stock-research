import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Briefcase, Handshake, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

/**
 * CapitalDeployments — Intelligence Hub module.
 *
 * Accepts the data payload from
 *   GET /api/stocks/:ticker/capital-deployments
 * shaped as:
 *   {
 *     ticker, is_13f_filer, filing_date,
 *     new_this_quarter: [{ ticker, name, value_usd, shares, badge?: 'NEW'|'TOPUP'|'EXITED', qoq_change_pct? }],
 *     current_book:     [...],
 *     acquisitions:     [{ date, target_name, deal_size_text, filing_url }],
 *   }
 */

const COLLAPSE_THRESHOLD = 5;

const fmtUsd = (v) => {
  if (v == null) return 'N/A';
  if (v >= 1e9) return `~$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `~$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `~$${(v / 1e3).toFixed(0)}K`;
  return `~$${v.toFixed(0)}`;
};

const fmtShares = (s) => {
  if (s == null) return '';
  if (s >= 1e6) return `${(s / 1e6).toFixed(2)}M sh`;
  if (s >= 1e3) return `${(s / 1e3).toFixed(1)}K sh`;
  return `${s} sh`;
};

const HoldingBadge = ({ kind, pct }) => {
  if (kind === 'NEW') {
    return (
      <Badge
        data-testid="cd-badge-new"
        className="text-[10px] font-bold tracking-wide bg-[rgba(217,70,239,0.18)] text-[#f0abfc] border border-[rgba(217,70,239,0.45)] px-1.5 py-0"
      >
        NEW
      </Badge>
    );
  }
  if (kind === 'EXITED') {
    return (
      <Badge
        data-testid="cd-badge-exited"
        className="text-[10px] font-bold tracking-wide bg-[rgba(239,68,68,0.18)] text-red-300 border border-[rgba(239,68,68,0.45)] px-1.5 py-0"
      >
        EXITED
      </Badge>
    );
  }
  if (kind === 'TOPUP' && pct != null) {
    const sign = pct >= 0 ? '+' : '';
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              data-testid="cd-badge-pct"
              className={`text-[10px] font-bold tracking-wide px-1.5 py-0 cursor-help ${
                pct >= 0
                  ? 'bg-[rgba(34,197,94,0.18)] text-green-300 border border-[rgba(34,197,94,0.45)]'
                  : 'bg-[rgba(239,68,68,0.18)] text-red-300 border border-[rgba(239,68,68,0.45)]'
              }`}
            >
              {sign}
              {pct}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-[#0f0f14] border border-[rgba(217,70,239,0.3)] text-xs text-gray-200"
          >
            Position size {pct >= 0 ? 'grew' : 'shrank'} {Math.abs(pct)}% quarter-over-quarter
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
};

const HoldingRow = ({ row, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={`cd-holding-row-${row.ticker}`}
    className="w-full text-left px-3 py-3 hover:bg-[rgba(217,70,239,0.06)] transition-colors duration-150 border-b border-[rgba(255,255,255,0.04)] last:border-b-0"
    title={`Click to stack ${row.ticker}`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <div
            className="font-bold text-sm text-white"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {row.ticker}
          </div>
          <div className="text-[11px] text-gray-400 truncate">{row.name}</div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div
          className="text-sm font-semibold text-white"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {fmtUsd(row.value_usd)}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] text-gray-500"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {fmtShares(row.shares)}
          </span>
          <HoldingBadge kind={row.badge} pct={row.qoq_change_pct} />
        </div>
      </div>
    </div>
  </button>
);

const HoldingList = ({ rows, emptyText }) => {
  const [expanded, setExpanded] = useState(false);
  if (!rows || rows.length === 0) {
    return <div className="text-xs text-gray-500 italic py-3 px-3">{emptyText}</div>;
  }
  const shown = expanded ? rows : rows.slice(0, COLLAPSE_THRESHOLD);
  const canCollapse = rows.length > COLLAPSE_THRESHOLD;

  return (
    <div>
      <div className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
        {shown.map((r) => (
          <HoldingRow key={r.ticker} row={r} onClick={() => {}} />
        ))}
      </div>
      {canCollapse && (
        <button
          type="button"
          data-testid="cd-collapse-toggle"
          onClick={() => setExpanded((e) => !e)}
          className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#d946ef] hover:text-[#f0abfc] transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show 5 only
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show all {rows.length} holdings
            </>
          )}
        </button>
      )}
    </div>
  );
};

const AcquisitionRow = ({ row }) => (
  <a
    href={row.filing_url}
    target="_blank"
    rel="noopener noreferrer"
    data-testid={`cd-acq-row-${row.date}`}
    className="block px-3 py-3 hover:bg-[rgba(217,70,239,0.06)] transition-colors duration-150 border-b border-[rgba(255,255,255,0.04)] last:border-b-0"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px] text-gray-500 mb-0.5"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {row.date}
        </div>
        <div
          className="font-bold text-sm text-white truncate"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {row.target_name}
        </div>
        <div className="text-[11px] text-gray-400 truncate">{row.deal_size_text}</div>
      </div>
      <Badge
        data-testid="cd-badge-acquired"
        className="text-[10px] font-bold tracking-wide bg-[rgba(234,179,8,0.18)] text-yellow-200 border border-[rgba(234,179,8,0.45)] px-1.5 py-0 flex-shrink-0"
      >
        ACQUIRED
      </Badge>
    </div>
  </a>
);

const CapitalDeployments = ({ data, loading }) => {
  if (loading) {
    return (
      <div
        data-testid="cd-loading"
        className="flex items-center justify-center gap-2 py-8 text-xs text-gray-400"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Pulling the latest filings…
      </div>
    );
  }
  if (!data) return null;

  const {
    is_13f_filer: is13F,
    filing_date: filingDate,
    new_this_quarter: newThisQ = [],
    current_book: currentBook = [],
    acquisitions = [],
  } = data;

  const has13F = is13F && (newThisQ.length > 0 || currentBook.length > 0);
  const hasMA = acquisitions.length > 0;

  if (!has13F && !hasMA) {
    return (
      <div
        data-testid="cd-empty-both"
        className="text-xs text-gray-500 italic px-3 py-6 text-center"
      >
        No reported capital deployments. Switch to{' '}
        <span className="text-[#d946ef]">Whale Watch</span> for a holder-side view.
      </div>
    );
  }

  return (
    <div className="space-y-5 px-1 sm:px-2 pb-2" data-testid="capital-deployments">
      {/* Module subhead */}
      <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed px-1">
        An auto-summary of this company's capital allocation — public-stock holdings (13F)
        and acquisitions (8-K).
      </p>

      {/* Section 1 — Public-Stock Holdings */}
      <section data-testid="cd-section-holdings">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-[#d946ef]" />
            <h3
              className="text-xs sm:text-sm font-semibold text-white tracking-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Public-Stock Holdings
            </h3>
          </div>
          {filingDate && (
            <span
              className="text-[10px] text-gray-500"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              as of {filingDate}
            </span>
          )}
        </div>

        {!is13F ? (
          <div
            data-testid="cd-empty-13f"
            className="text-[11px] text-gray-500 italic px-3 py-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"
          >
            {data.ticker || 'This company'} is not a Form 13F filer. See{' '}
            <span className="text-[#d946ef]">Whale Watch</span> for institutions on the other
            side of the trade.
          </div>
        ) : (
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] p-0.5 h-auto">
              <TabsTrigger
                value="new"
                data-testid="cd-tab-new"
                className="text-[11px] sm:text-xs px-3 py-1.5 data-[state=active]:bg-[rgba(217,70,239,0.18)] data-[state=active]:text-[#f0abfc]"
              >
                New This Quarter
              </TabsTrigger>
              <TabsTrigger
                value="book"
                data-testid="cd-tab-book"
                className="text-[11px] sm:text-xs px-3 py-1.5 data-[state=active]:bg-[rgba(217,70,239,0.18)] data-[state=active]:text-[#f0abfc]"
              >
                Current Book
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-2">
              <p className="text-[11px] text-gray-500 italic px-1 mb-1.5">
                Fresh positions and material additions from the most recent 13F.
              </p>
              <HoldingList
                rows={newThisQ}
                emptyText="No new positions disclosed in the most recent 13F."
              />
            </TabsContent>

            <TabsContent value="book" className="mt-2">
              <p className="text-[11px] text-gray-500 italic px-1 mb-1.5">
                All holdings as of {filingDate || 'the latest filing'}, ranked by market
                value.
              </p>
              <HoldingList
                rows={currentBook}
                emptyText="No holdings reported in the latest filing."
              />
            </TabsContent>
          </Tabs>
        )}
      </section>

      {/* Section 2 — Acquisitions */}
      <section data-testid="cd-section-acquisitions">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Handshake className="w-3.5 h-3.5 text-[#d946ef]" />
          <h3
            className="text-xs sm:text-sm font-semibold text-white tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Acquisitions — Last 12 Months
          </h3>
        </div>
        <p className="text-[11px] text-gray-500 italic px-1 mb-1.5">
          Material acquisitions disclosed in 8-K filings with the SEC.
        </p>

        {hasMA ? (
          <div className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
            {acquisitions.map((a) => (
              <AcquisitionRow key={`${a.date}-${a.target_name}`} row={a} />
            ))}
          </div>
        ) : (
          <div
            data-testid="cd-empty-ma"
            className="text-[11px] text-gray-500 italic px-3 py-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]"
          >
            No 8-K acquisition disclosures in the last 12 months.
          </div>
        )}
      </section>

      {/* Footer */}
      <p className="text-[10px] text-gray-600 italic px-1 pt-1 border-t border-[rgba(255,255,255,0.04)]">
        Source: SEC EDGAR (Forms 13F-HR &amp; 8-K).
      </p>
    </div>
  );
};

export default CapitalDeployments;
