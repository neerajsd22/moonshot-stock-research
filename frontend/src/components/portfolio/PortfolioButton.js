import { Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePortfolioSummary } from './usePortfolioSummary';

/**
 * Header button that routes to /portfolio.
 * Shows a pulsing dot indicator:
 *   - green if portfolio is up today
 *   - red if down today
 *   - gray if flat or empty
 * Hover (desktop) reveals today's $/% in a small tooltip via title attribute.
 */
const PortfolioButton = () => {
  const navigate = useNavigate();
  const { summary } = usePortfolioSummary();

  const empty = !summary || summary.is_empty;
  const today = summary?.today_change ?? 0;
  const todayPct = summary?.today_change_pct ?? 0;

  let dotColor = 'bg-gray-400';
  if (!empty) {
    if (today > 0) dotColor = 'bg-green-400';
    else if (today < 0) dotColor = 'bg-red-400';
  }

  const tooltip = empty
    ? 'Click to build your portfolio'
    : `Today: ${today >= 0 ? '+' : '-'}$${Math.abs(today).toFixed(2)} (${todayPct >= 0 ? '+' : ''}${todayPct.toFixed(2)}%)`;

  return (
    <button
      type="button"
      onClick={() => navigate('/portfolio')}
      data-testid="portfolio-header-button"
      title={tooltip}
      className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-9 sm:h-10 rounded-lg
                 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]
                 hover:border-[#d946ef]/50 hover:bg-[rgba(217,70,239,0.06)]
                 text-xs sm:text-sm text-gray-300 hover:text-white
                 transition-all duration-200"
      style={{ fontFamily: 'Outfit, sans-serif' }}
    >
      <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">Portfolio</span>
      <span
        data-testid="portfolio-dot"
        data-state={empty ? 'empty' : today > 0 ? 'up' : today < 0 ? 'down' : 'flat'}
        className={`relative flex h-2 w-2 ml-0.5`}
      >
        {!empty && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotColor}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>
    </button>
  );
};

export default PortfolioButton;
