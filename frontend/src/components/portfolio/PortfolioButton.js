import { Wallet } from 'lucide-react';
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
      className="relative inline-flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 h-12 sm:h-11 px-2 sm:px-4 rounded-md text-sm font-medium btn-outline-gold transition-all duration-200"
      style={{ fontFamily: 'Outfit, sans-serif' }}
    >
      <span className="relative flex items-center">
        <Wallet className="w-4 h-4" />
        <span
          data-testid="portfolio-dot"
          data-state={empty ? 'empty' : today > 0 ? 'up' : today < 0 ? 'down' : 'flat'}
          className="absolute -top-1 -right-1.5 flex h-2 w-2"
        >
          {!empty && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
      </span>
      <span className="text-[9px] sm:text-sm leading-none sm:leading-normal">Portfolio</span>
    </button>
  );
};

export default PortfolioButton;
