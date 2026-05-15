import { RefreshCw } from 'lucide-react';

const PullToRefreshIndicator = ({ pullDistance, refreshing, progress }) => {
  if (pullDistance <= 0 && !refreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center pointer-events-none"
      style={{ height: `${pullDistance}px`, transition: pullDistance === 0 ? 'height 0.3s ease' : 'none' }}
      data-testid="pull-to-refresh-indicator"
    >
      <div
        className="flex items-center gap-2 bg-[#0a0a0f]/90 backdrop-blur-md border border-[rgba(217,70,239,0.3)] rounded-full px-4 py-2 shadow-lg"
        style={{
          opacity: Math.min(1, progress * 1.5),
          transform: `scale(${0.6 + progress * 0.4})`,
          transition: pullDistance === 0 ? 'all 0.3s ease' : 'none',
        }}
      >
        <RefreshCw
          className={`w-4 h-4 text-[#d946ef] ${refreshing ? 'animate-spin' : ''}`}
          style={{
            transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
            transition: refreshing ? 'none' : 'transform 0.05s linear',
          }}
        />
        <span className="text-xs text-gray-300 font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {refreshing ? 'Refreshing...' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
