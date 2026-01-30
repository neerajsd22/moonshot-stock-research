import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar, 
  Users, 
  BarChart3,
  Zap,
  Target,
  Shield,
  DollarSign,
  Activity,
  RefreshCw,
  Bell,
  Building2,
  GitCompare,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Grade Badge with better visibility
const GradeBadge = ({ grade }) => {
  const colors = {
    'A': 'bg-green-500/30 text-green-300 border-green-400/50',
    'B': 'bg-blue-500/30 text-blue-300 border-blue-400/50',
    'C': 'bg-yellow-500/30 text-yellow-300 border-yellow-400/50',
    'D': 'bg-red-500/30 text-red-300 border-red-400/50'
  };
  return (
    <Badge className={`${colors[grade] || colors['C']} text-xs font-bold px-1.5 py-0`}>
      {grade}
    </Badge>
  );
};

// Accordion Header Component
const AccordionHeader = ({ icon: Icon, title, summary, badge, badgeColor, isOpen, onClick, loading }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
      isOpen 
        ? 'bg-[rgba(217,70,239,0.1)] border border-[rgba(217,70,239,0.3)]' 
        : 'bg-[rgba(255,255,255,0.03)] border border-transparent hover:bg-[rgba(255,255,255,0.05)]'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-[#d946ef] flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <Icon className={`w-4 h-4 flex-shrink-0 ${isOpen ? 'text-[#d946ef]' : 'text-gray-400'}`} />
      <span className={`text-sm font-medium ${isOpen ? 'text-white' : 'text-gray-300'}`}>{title}</span>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      {loading ? (
        <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
      ) : (
        <>
          <span className="text-xs text-gray-400 hidden sm:inline">{summary}</span>
          {badge && (
            <Badge className={`text-xs px-2 py-0 ${badgeColor || 'bg-gray-500/30 text-gray-300'}`}>
              {badge}
            </Badge>
          )}
        </>
      )}
    </div>
  </button>
);

// Five Signals Analysis Component - Compact version for accordion
const FiveSignalsContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  const signalConfig = [
    { key: 'cash_generation', label: 'Cash Gen', icon: DollarSign },
    { key: 'competitive_position', label: 'Competitive', icon: Shield },
    { key: 'smart_money', label: 'Smart Money', icon: Users },
    { key: 'growth_quality', label: 'Growth', icon: TrendingUp },
    { key: 'valuation_sanity', label: 'Valuation', icon: Target }
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-5 gap-2">
        {signalConfig.map(({ key, label, icon: Icon }) => {
          const signal = data.signals?.[key];
          if (!signal) return null;
          return (
            <div key={key} className="text-center p-2 bg-[rgba(255,255,255,0.02)] rounded">
              <Icon className="w-3 h-3 mx-auto text-[#d946ef] mb-1" />
              <div className="text-[10px] text-gray-400">{label}</div>
              <div className="text-xs font-semibold text-white">{signal.score}/{signal.max_score}</div>
              <GradeBadge grade={signal.grade} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Earnings Intelligence Component - Compact
const EarningsContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  return (
    <div className="p-3">
      <div className="grid grid-cols-3 gap-3">
        {data.earnings_prediction && (
          <div className="p-2 bg-[rgba(217,70,239,0.1)] rounded text-center">
            <div className="text-[10px] text-gray-400">Beat Prob</div>
            <div className={`text-lg font-bold ${
              data.earnings_prediction.beat_probability >= 70 ? 'text-green-400' :
              data.earnings_prediction.beat_probability >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{data.earnings_prediction.beat_probability}%</div>
          </div>
        )}
        <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded text-center">
          <div className="text-[10px] text-gray-400">Beat Rate</div>
          <div className="text-lg font-bold text-green-400">{data.beat_rate || 0}%</div>
        </div>
        {data.estimate_revisions?.target_price_mean && (
          <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded text-center">
            <div className="text-[10px] text-gray-400">Target</div>
            <div className="text-lg font-bold text-white">${data.estimate_revisions.target_price_mean?.toFixed(0)}</div>
          </div>
        )}
      </div>
      {data.earnings_prediction?.key_factors?.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {data.earnings_prediction.key_factors.slice(0, 2).map((f, i) => (
            <div key={i} className="flex items-start gap-1"><span className="text-[#d946ef]">•</span>{f}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Why Moving Component - Compact
const WhyMovingContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  const change = data.change_today || {};
  const isUp = change.direction === 'up';

  return (
    <div className="p-3">
      <div className={`p-2 rounded ${isUp ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
        <div className="flex items-center gap-2 mb-1">
          {isUp ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          <span className={`text-lg font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {change.change_pct > 0 ? '+' : ''}{change.change_pct?.toFixed(2)}%
          </span>
          {change.volume_vs_avg && (
            <span className="text-xs text-gray-400 ml-auto">Vol: {change.volume_vs_avg?.toFixed(1)}x</span>
          )}
        </div>
        <div className="text-xs text-gray-300">{data.ai_summary}</div>
      </div>
      {data.potential_catalysts?.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.potential_catalysts.slice(0, 2).map((c, i) => (
            <div key={i} className="text-xs text-gray-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#d946ef]" />{c.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Insider Alerts Component - Full text visible
const InsiderContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  return (
    <div className="p-3 space-y-2">
      {data.cluster_alert && (
        <div className={`p-2 rounded text-xs ${
          data.signal_strength === 'strong' ? 'bg-green-500/15 text-green-300' :
          data.signal_strength === 'moderate' ? 'bg-yellow-500/15 text-yellow-300' :
          'bg-[rgba(255,255,255,0.05)] text-gray-300'
        }`}>
          <Bell className="w-3 h-3 inline mr-1" />{data.summary}
        </div>
      )}
      {!data.cluster_alert && (
        <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded text-xs text-gray-400 text-center">
          {data.summary}
        </div>
      )}
      {data.insider_transactions?.length > 0 && (
        <div className="space-y-1">
          {data.insider_transactions.slice(0, 5).map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 bg-[rgba(255,255,255,0.02)] rounded text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${txn.type === 'buy' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-300">{txn.insider}</span>
                {txn.title && <span className="text-gray-500 text-[10px]">({txn.title})</span>}
              </div>
              <span className={`font-medium flex-shrink-0 ml-2 ${txn.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                {txn.type === 'buy' ? '+' : '-'}{txn.shares?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Whale Watch Component - Full text visible
const WhaleContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  return (
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded text-center">
          <div className="text-[10px] text-gray-400">Institutional</div>
          <div className="text-lg font-bold text-white">{data.institutional_summary?.institutional_ownership_pct}%</div>
        </div>
        <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded text-center">
          <div className="text-[10px] text-gray-400">Insider</div>
          <div className="text-lg font-bold text-white">{data.institutional_summary?.insider_ownership_pct}%</div>
        </div>
      </div>
      {data.whale_signal && (
        <div className="p-2 bg-[rgba(217,70,239,0.15)] rounded text-xs">
          <span className="text-[#d946ef] font-semibold">🐋 {data.whale_signal.type}</span>
          <span className="text-gray-300 ml-1">- {data.whale_signal.description}</span>
        </div>
      )}
      {data.top_holders?.length > 0 && (
        <div className="space-y-1">
          {data.top_holders.slice(0, 5).map((h, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 bg-[rgba(255,255,255,0.02)] rounded text-xs">
              <span className="text-gray-300">{h.name}</span>
              <span className="text-white font-medium">{h.pct_held}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Similar Stocks Component - Full text visible
const SimilarContent = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-400 p-2">No data available</div>;

  return (
    <div className="p-3 space-y-2">
      <div className="p-2 bg-[rgba(255,255,255,0.03)] rounded">
        <div className="text-xs text-gray-300">{data.summary}</div>
        {data.peer_comparison?.pe_premium_pct !== null && data.peer_comparison?.pe_premium_pct !== undefined && (
          <div className="mt-1 text-[10px] text-gray-400">
            P/E: <span className="text-white">{data.peer_comparison.your_pe}</span> vs Peers: <span className="text-white">{data.peer_comparison.peer_avg_pe}</span>
          </div>
        )}
      </div>
      {data.similar_stocks?.length > 0 && (
        <div className="space-y-1">
          {data.similar_stocks.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 bg-[rgba(255,255,255,0.02)] rounded text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-semibold text-white">{s.ticker}</span>
                <span className="text-gray-400">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(1)}%
                </span>
                <Badge className="text-[10px] bg-[rgba(255,255,255,0.1)] text-gray-300 px-1">
                  {s.similarity_score}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Intelligence Hub Component - Accordion Style
const IntelligenceHub = ({ ticker }) => {
  const [expandedSection, setExpandedSection] = useState('signals');
  const [fiveSignals, setFiveSignals] = useState(null);
  const [earningsIntel, setEarningsIntel] = useState(null);
  const [whyMoving, setWhyMoving] = useState(null);
  const [insiderAlerts, setInsiderAlerts] = useState(null);
  const [whaleWatch, setWhaleWatch] = useState(null);
  const [similarStocks, setSimilarStocks] = useState(null);
  const [loading, setLoading] = useState({});

  const fetchData = async (type) => {
    if (!ticker) return;
    setLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      const endpoints = {
        signals: 'five-signals',
        earnings: 'earnings-intelligence',
        moving: 'why-moving',
        insider: 'insider-alerts',
        whale: 'whale-watch',
        similar: 'similar-stocks'
      };
      
      const res = await axios.get(`${API}/api/stocks/${ticker}/${endpoints[type]}`);
      
      switch(type) {
        case 'signals': setFiveSignals(res.data); break;
        case 'earnings': setEarningsIntel(res.data); break;
        case 'moving': setWhyMoving(res.data); break;
        case 'insider': setInsiderAlerts(res.data); break;
        case 'whale': setWhaleWatch(res.data); break;
        case 'similar': setSimilarStocks(res.data); break;
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    if (ticker) {
      ['signals', 'earnings', 'moving', 'insider', 'whale', 'similar'].forEach(fetchData);
    }
  }, [ticker]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const refreshAll = () => {
    ['signals', 'earnings', 'moving', 'insider', 'whale', 'similar'].forEach(fetchData);
  };

  if (!ticker) return null;

  // Generate summaries for headers
  const getSignalsSummary = () => fiveSignals ? `${fiveSignals.overall_score}/100` : '';
  const getSignalsBadge = () => fiveSignals?.verdict || '';
  const getSignalsBadgeColor = () => {
    if (!fiveSignals) return '';
    return fiveSignals.verdict === 'STRONG BUY' || fiveSignals.verdict === 'BUY' 
      ? 'bg-green-500/30 text-green-300' 
      : fiveSignals.verdict === 'HOLD' 
        ? 'bg-yellow-500/30 text-yellow-300' 
        : 'bg-red-500/30 text-red-300';
  };

  const getEarningsSummary = () => earningsIntel?.earnings_prediction ? `Beat: ${earningsIntel.earnings_prediction.beat_probability}%` : '';
  const getMovingSummary = () => {
    if (!whyMoving?.change_today) return '';
    const pct = whyMoving.change_today.change_pct;
    return `${pct > 0 ? '+' : ''}${pct?.toFixed(1)}%`;
  };
  const getMovingBadge = () => whyMoving?.movement_strength || '';
  
  const getInsiderSummary = () => {
    if (insiderAlerts?.signal_strength === 'strong') return 'Strong Signal';
    if (insiderAlerts?.signal_strength === 'moderate') return 'Moderate';
    if (insiderAlerts?.ceo_buying) return 'CEO Buying';
    return '';
  };
  const getInsiderBadge = () => insiderAlerts?.cluster_alert?.type || '';
  const getInsiderBadgeColor = () => {
    if (insiderAlerts?.signal_strength === 'strong') return 'bg-green-500/30 text-green-300';
    if (insiderAlerts?.signal_strength === 'moderate') return 'bg-yellow-500/30 text-yellow-300';
    return 'bg-gray-500/30 text-gray-300';
  };

  const getWhaleSummary = () => whaleWatch?.institutional_summary ? `Inst: ${whaleWatch.institutional_summary.institutional_ownership_pct}%` : '';
  const getWhaleBadge = () => whaleWatch?.whale_signal?.type || '';

  const getSimilarSummary = () => {
    if (!similarStocks?.peer_comparison?.pe_premium_pct) return '';
    const pct = similarStocks.peer_comparison.pe_premium_pct;
    return pct < 0 ? `${Math.abs(pct).toFixed(0)}% discount` : `${pct.toFixed(0)}% premium`;
  };

  return (
    <Card className="premium-card gold-gradient-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Brain className="w-4 h-4 text-[#d946ef]" />
            Intelligence Hub
            <span className="text-xs text-[#d946ef] bg-[rgba(217,70,239,0.2)] px-2 py-1 rounded-md font-semibold border border-[rgba(217,70,239,0.4)]">Beta</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAll}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1">
        {/* 5 Signals */}
        <div>
          <AccordionHeader
            icon={Target}
            title="5 Signals"
            summary={getSignalsSummary()}
            badge={getSignalsBadge()}
            badgeColor={getSignalsBadgeColor()}
            isOpen={expandedSection === 'signals'}
            onClick={() => toggleSection('signals')}
            loading={loading.signals}
          />
          {expandedSection === 'signals' && <FiveSignalsContent data={fiveSignals} />}
        </div>

        {/* Earnings */}
        <div>
          <AccordionHeader
            icon={Calendar}
            title="Earnings"
            summary={getEarningsSummary()}
            badge={earningsIntel?.estimate_revisions?.target_price_mean ? `$${earningsIntel.estimate_revisions.target_price_mean.toFixed(0)}` : ''}
            isOpen={expandedSection === 'earnings'}
            onClick={() => toggleSection('earnings')}
            loading={loading.earnings}
          />
          {expandedSection === 'earnings' && <EarningsContent data={earningsIntel} />}
        </div>

        {/* Why Moving */}
        <div>
          <AccordionHeader
            icon={Zap}
            title="Why Moving"
            summary={getMovingSummary()}
            badge={getMovingBadge()}
            badgeColor={whyMoving?.change_today?.direction === 'up' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}
            isOpen={expandedSection === 'moving'}
            onClick={() => toggleSection('moving')}
            loading={loading.moving}
          />
          {expandedSection === 'moving' && <WhyMovingContent data={whyMoving} />}
        </div>

        {/* Insider */}
        <div>
          <AccordionHeader
            icon={Bell}
            title="Insider Alerts"
            summary={getInsiderSummary()}
            badge={getInsiderBadge()}
            badgeColor={getInsiderBadgeColor()}
            isOpen={expandedSection === 'insider'}
            onClick={() => toggleSection('insider')}
            loading={loading.insider}
          />
          {expandedSection === 'insider' && <InsiderContent data={insiderAlerts} />}
        </div>

        {/* Whales */}
        <div>
          <AccordionHeader
            icon={Building2}
            title="Whale Watch"
            summary={getWhaleSummary()}
            badge={getWhaleBadge()}
            badgeColor="bg-[rgba(217,70,239,0.3)] text-[#f0abfc]"
            isOpen={expandedSection === 'whale'}
            onClick={() => toggleSection('whale')}
            loading={loading.whale}
          />
          {expandedSection === 'whale' && <WhaleContent data={whaleWatch} />}
        </div>

        {/* Similar */}
        <div>
          <AccordionHeader
            icon={GitCompare}
            title="Similar Stocks"
            summary={getSimilarSummary()}
            badge={similarStocks?.profile?.sector || ''}
            badgeColor="bg-[rgba(255,255,255,0.1)] text-gray-300"
            isOpen={expandedSection === 'similar'}
            onClick={() => toggleSection('similar')}
            loading={loading.similar}
          />
          {expandedSection === 'similar' && <SimilarContent data={similarStocks} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligenceHub;
