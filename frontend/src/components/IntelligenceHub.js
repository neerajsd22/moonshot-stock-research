import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  GitCompare
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
    <Badge className={`${colors[grade] || colors['C']} text-sm font-bold px-2 py-0.5`}>
      {grade}
    </Badge>
  );
};

// Signal Progress Bar - More visible
const SignalBar = ({ score, maxScore, label }) => {
  const pct = (score / maxScore) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-semibold">{score}/{maxScore}</span>
      </div>
      <div className="h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-blue-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// Five Signals Analysis Component
const FiveSignalsAnalysis = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 loading-skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const signalConfig = [
    { key: 'cash_generation', label: 'Cash Generation', icon: DollarSign, desc: 'FCF quality' },
    { key: 'competitive_position', label: 'Competitive Position', icon: Shield, desc: 'Margins' },
    { key: 'smart_money', label: 'Smart Money', icon: Users, desc: 'Institutional' },
    { key: 'growth_quality', label: 'Growth Quality', icon: TrendingUp, desc: 'Acceleration' },
    { key: 'valuation_sanity', label: 'Valuation', icon: Target, desc: 'Value' }
  ];

  return (
    <div className="space-y-3">
      {/* Overall Score - Compact */}
      <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.05)] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-white">{data.overall_score}<span className="text-base text-gray-400">/100</span></div>
        </div>
        <Badge className={`text-sm px-3 py-1 font-bold ${
          data.verdict === 'STRONG BUY' || data.verdict === 'BUY' ? 'bg-green-500/30 text-green-300' :
          data.verdict === 'HOLD' ? 'bg-yellow-500/30 text-yellow-300' :
          'bg-red-500/30 text-red-300'
        }`}>
          {data.verdict}
        </Badge>
      </div>

      {/* Individual Signals - Compact */}
      <div className="space-y-2">
        {signalConfig.map(({ key, label, icon: Icon }) => {
          const signal = data.signals?.[key];
          if (!signal) return null;
          
          return (
            <div key={key} className="flex items-center gap-3 p-2 bg-[rgba(255,255,255,0.03)] rounded-lg">
              <Icon className="w-4 h-4 text-[#d946ef] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">{signal.score}/{signal.max_score}</span>
                    <GradeBadge grade={signal.grade} />
                  </div>
                </div>
                <div className="mt-1 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      signal.grade === 'A' ? 'bg-green-400' : 
                      signal.grade === 'B' ? 'bg-blue-400' : 
                      signal.grade === 'C' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${(signal.score / signal.max_score) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Earnings Intelligence Component - Compact
const EarningsIntelligence = ({ data, loading }) => {
  if (loading) {
    return <div className="h-40 loading-skeleton rounded-lg" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Beat Probability */}
      {data.earnings_prediction && (
        <div className="p-3 bg-[rgba(217,70,239,0.15)] rounded-lg border border-[rgba(217,70,239,0.3)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Beat Probability</span>
            <Badge className={`text-lg px-3 py-1 font-bold ${
              data.earnings_prediction.beat_probability >= 70 ? 'bg-green-500/30 text-green-300' :
              data.earnings_prediction.beat_probability >= 50 ? 'bg-yellow-500/30 text-yellow-300' :
              'bg-red-500/30 text-red-300'
            }`}>
              {data.earnings_prediction.beat_probability}%
            </Badge>
          </div>
          {data.earnings_prediction.key_factors?.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.earnings_prediction.key_factors.slice(0, 2).map((factor, i) => (
                <div key={i} className="text-xs text-gray-300 flex items-start gap-1">
                  <span className="text-[#d946ef]">•</span> {factor}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History & Targets */}
      <div className="grid grid-cols-2 gap-2">
        {/* Beat Rate */}
        <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg">
          <div className="text-xs text-gray-400">Historical Beat Rate</div>
          <div className="text-xl font-bold text-green-400">{data.beat_rate || 0}%</div>
        </div>
        
        {/* Target Price */}
        {data.estimate_revisions?.target_price_mean && (
          <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg">
            <div className="text-xs text-gray-400">Target Price</div>
            <div className="text-xl font-bold text-white">${data.estimate_revisions.target_price_mean?.toFixed(0)}</div>
          </div>
        )}
      </div>

      {/* Insider Sentiment */}
      {data.insider_activity?.net_sentiment && (
        <div className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.03)] rounded-lg">
          <span className="text-sm text-gray-300">Insider Sentiment</span>
          <Badge className={`capitalize text-sm ${
            data.insider_activity.net_sentiment === 'bullish' ? 'bg-green-500/30 text-green-300' :
            data.insider_activity.net_sentiment === 'bearish' ? 'bg-red-500/30 text-red-300' :
            'bg-gray-500/30 text-gray-300'
          }`}>
            {data.insider_activity.net_sentiment}
          </Badge>
        </div>
      )}
    </div>
  );
};

// Why Moving Component - Compact
const WhyMoving = ({ data, loading }) => {
  if (loading) {
    return <div className="h-32 loading-skeleton rounded-lg" />;
  }
  if (!data) return null;

  const change = data.change_today || {};
  const isUp = change.direction === 'up';

  return (
    <div className="space-y-3">
      {/* Movement Summary */}
      <div className={`p-3 rounded-lg ${isUp ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isUp ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            <span className={`text-xl font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {change.change_pct > 0 ? '+' : ''}{change.change_pct?.toFixed(2)}%
            </span>
          </div>
          <Badge className={`capitalize text-sm ${
            data.movement_strength === 'extreme' ? 'bg-purple-500/30 text-purple-300' :
            data.movement_strength === 'significant' ? 'bg-blue-500/30 text-blue-300' :
            'bg-gray-500/30 text-gray-300'
          }`}>
            {data.movement_strength}
          </Badge>
        </div>
        <div className="text-sm text-gray-300 mt-2">{data.ai_summary}</div>
      </div>

      {/* Volume */}
      {change.volume_vs_avg && (
        <div className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.03)] rounded-lg">
          <span className="text-sm text-gray-300">Volume vs Avg</span>
          <span className={`text-sm font-semibold ${change.volume_vs_avg > 2 ? 'text-yellow-400' : 'text-white'}`}>
            {change.volume_vs_avg?.toFixed(1)}x
          </span>
        </div>
      )}

      {/* Catalysts */}
      {data.potential_catalysts?.length > 0 && (
        <div className="space-y-1">
          {data.potential_catalysts.slice(0, 2).map((c, i) => (
            <div key={i} className="text-sm text-gray-300 flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded">
              <Activity className="w-3 h-3 text-[#d946ef]" />
              {c.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// NEW: Insider Alerts Component
const InsiderAlerts = ({ data, loading }) => {
  if (loading) {
    return <div className="h-32 loading-skeleton rounded-lg" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Alert Banner */}
      {data.cluster_alert && (
        <div className={`p-3 rounded-lg border ${
          data.signal_strength === 'strong' ? 'bg-green-500/15 border-green-500/40' :
          data.signal_strength === 'moderate' ? 'bg-yellow-500/15 border-yellow-500/40' :
          'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]'
        }`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 ${data.signal_strength === 'strong' ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className="text-sm font-bold text-white">{data.cluster_alert.type}</span>
          </div>
          <div className="text-sm text-gray-300 mt-1">{data.summary}</div>
        </div>
      )}

      {!data.cluster_alert && (
        <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg text-center">
          <div className="text-sm text-gray-400">{data.summary}</div>
        </div>
      )}

      {/* Recent Transactions */}
      {data.insider_transactions?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400 font-medium mb-2">Recent Insider Activity</div>
          {data.insider_transactions.slice(0, 4).map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.02)] rounded text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${txn.type === 'buy' ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-gray-300 truncate max-w-[120px]">{txn.insider}</span>
              </div>
              <span className={`font-medium ${txn.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                {txn.type === 'buy' ? '+' : '-'}{txn.shares?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// NEW: Whale Watch Component
const WhaleWatch = ({ data, loading }) => {
  if (loading) {
    return <div className="h-32 loading-skeleton rounded-lg" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="p-3 bg-[rgba(255,255,255,0.05)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-[#d946ef]" />
          <span className="text-sm font-semibold text-white">Institutional Overview</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">Inst. Ownership</div>
            <div className="text-lg font-bold text-white">{data.institutional_summary?.institutional_ownership_pct}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Insider Ownership</div>
            <div className="text-lg font-bold text-white">{data.institutional_summary?.insider_ownership_pct}%</div>
          </div>
        </div>
      </div>

      {/* Whale Signal */}
      {data.whale_signal && (
        <div className="p-2 bg-[rgba(217,70,239,0.15)] rounded-lg border border-[rgba(217,70,239,0.3)]">
          <div className="text-sm font-semibold text-[#d946ef]">🐋 {data.whale_signal.type}</div>
          <div className="text-xs text-gray-300">{data.whale_signal.description}</div>
        </div>
      )}

      {/* Top Holders */}
      {data.top_holders?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400 font-medium">Top Holders</div>
          {data.top_holders.slice(0, 4).map((h, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.02)] rounded text-sm">
              <span className="text-gray-300 truncate max-w-[150px]">{h.name}</span>
              <span className="text-white font-medium">{h.pct_held}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// NEW: Similar Stocks Component
const SimilarStocks = ({ data, loading }) => {
  if (loading) {
    return <div className="h-32 loading-skeleton rounded-lg" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="p-3 bg-[rgba(255,255,255,0.05)] rounded-lg">
        <div className="text-sm text-gray-300">{data.summary}</div>
        {data.peer_comparison?.pe_premium_pct && (
          <div className="mt-2 text-xs">
            <span className="text-gray-400">Your P/E: </span>
            <span className="text-white font-medium">{data.peer_comparison.your_pe}</span>
            <span className="text-gray-400"> vs Peers: </span>
            <span className="text-white font-medium">{data.peer_comparison.peer_avg_pe}</span>
          </div>
        )}
      </div>

      {/* Similar Stocks */}
      {data.similar_stocks?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400 font-medium">Similar Stocks</div>
          {data.similar_stocks.slice(0, 4).map((s, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-[rgba(255,255,255,0.02)] rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{s.ticker}</span>
                <span className="text-xs text-gray-400 truncate max-w-[80px]">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(1)}%
                </span>
                <Badge className="text-xs bg-[rgba(255,255,255,0.1)] text-gray-300">
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

// Main Intelligence Hub Component
const IntelligenceHub = ({ ticker }) => {
  const [activeTab, setActiveTab] = useState('signals');
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
      // Fetch all data
      ['signals', 'earnings', 'moving', 'insider', 'whale', 'similar'].forEach(fetchData);
    }
  }, [ticker]);

  if (!ticker) return null;

  return (
    <Card className="premium-card gold-gradient-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Brain className="w-4 h-4 text-[#d946ef]" />
            Intelligence Hub
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => ['signals', 'earnings', 'moving', 'insider', 'whale', 'similar'].forEach(fetchData)}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6 mb-3 h-9">
            <TabsTrigger value="signals" className="text-[11px] px-1">
              <Target className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">5 Signals</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-[11px] px-1">
              <Calendar className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="moving" className="text-[11px] px-1">
              <Zap className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">Moving</span>
            </TabsTrigger>
            <TabsTrigger value="insider" className="text-[11px] px-1">
              <Bell className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">Insider</span>
            </TabsTrigger>
            <TabsTrigger value="whale" className="text-[11px] px-1">
              <Building2 className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">Whales</span>
            </TabsTrigger>
            <TabsTrigger value="similar" className="text-[11px] px-1">
              <GitCompare className="w-3 h-3 mr-0.5" />
              <span className="hidden sm:inline">Similar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-0">
            <FiveSignalsAnalysis data={fiveSignals} loading={loading.signals} />
          </TabsContent>
          <TabsContent value="earnings" className="mt-0">
            <EarningsIntelligence data={earningsIntel} loading={loading.earnings} />
          </TabsContent>
          <TabsContent value="moving" className="mt-0">
            <WhyMoving data={whyMoving} loading={loading.moving} />
          </TabsContent>
          <TabsContent value="insider" className="mt-0">
            <InsiderAlerts data={insiderAlerts} loading={loading.insider} />
          </TabsContent>
          <TabsContent value="whale" className="mt-0">
            <WhaleWatch data={whaleWatch} loading={loading.whale} />
          </TabsContent>
          <TabsContent value="similar" className="mt-0">
            <SimilarStocks data={similarStocks} loading={loading.similar} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IntelligenceHub;
