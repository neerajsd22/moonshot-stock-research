import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Briefcase, Plus, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import PortfolioSummary from './PortfolioSummary';
import PositionCard from './PositionCard';
import AddPositionDialog from './AddPositionDialog';
import ImportDialog from './ImportDialog';
import { portfolioApi } from './api';
import { usePortfolioSummary } from './usePortfolioSummary';

const PortfolioPage = () => {
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { summary, refresh: refreshSummary } = usePortfolioSummary();

  const load = async () => {
    try {
      const data = await portfolioApi.list();
      setPositions(data);
    } catch (err) {
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshSummary()]);
    setRefreshing(false);
    toast.success('Portfolio refreshed');
  };

  const handleChanged = async () => {
    await Promise.all([load(), refreshSummary()]);
  };

  return (
    <div className="min-h-screen text-white" data-testid="portfolio-page">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,15,0.9)] backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            data-testid="portfolio-back-button"
            className="p-1.5 sm:p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-gray-300 hover:text-white transition-colors"
            aria-label="Back to stocks"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#d946ef] flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold gold-text truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                My Portfolio
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                {summary && !summary.is_empty
                  ? `${summary.position_count} position${summary.position_count !== 1 ? 's' : ''} · live P&L`
                  : 'Track your real holdings, live'}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="portfolio-refresh"
          className="gap-1.5 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
        {loading ? (
          <div className="space-y-3">
            <div className="loading-skeleton h-32 rounded-lg" />
            <div className="loading-skeleton h-24 rounded-lg" />
            <div className="loading-skeleton h-24 rounded-lg" />
          </div>
        ) : positions.length === 0 ? (
          <Card className="premium-card gold-gradient-border" data-testid="portfolio-empty-state">
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-[#d946ef] opacity-50" />
              <h2 className="text-xl font-semibold mb-2 gold-text" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Your portfolio is empty
              </h2>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                Add your first position to start tracking live gains &amp; losses, or import from any brokerage.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => setShowAdd(true)} className="bg-[#d946ef] hover:bg-[#f0abfc] text-[#0a0a0f] font-semibold gap-1.5" data-testid="empty-add-button">
                  <Plus className="w-4 h-4" /> Add Position
                </Button>
                <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5" data-testid="empty-import-button">
                  <Upload className="w-4 h-4" /> Import from Broker
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <PortfolioSummary
              summary={summary}
              onAdd={() => setShowAdd(true)}
              onImport={() => setShowImport(true)}
            />
            <div className="space-y-3" data-testid="position-list">
              {positions.map((p) => (
                <PositionCard key={p.id} position={p} onChanged={handleChanged} />
              ))}
            </div>
            <div className="text-xs text-gray-500 text-center pt-2 max-w-md mx-auto">
              ⓘ Unrealized P&amp;L only. Excludes taxes, fees, and realized gains.
              Live prices via Yahoo Finance, may be delayed up to 15 min.
            </div>
          </>
        )}
      </main>

      <AddPositionDialog
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={handleChanged}
      />
      <ImportDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={handleChanged}
      />
    </div>
  );
};

export default PortfolioPage;
