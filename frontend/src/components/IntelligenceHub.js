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
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Signal Grade Badge
const GradeBadge = ({ grade }) => {
  const colors = {
    'A': 'bg-green-500/20 text-green-400 border-green-500/30',
    'B': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'C': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'D': 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  return (
    <Badge className={`${colors[grade] || colors['C']} text-xs font-bold`}>
      {grade}
    </Badge>
  );
};

// Signal Progress Bar
const SignalBar = ({ score, maxScore, label }) => {
  const pct = (score / maxScore) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// Five Signals Analysis Component
const FiveSignalsAnalysis = ({ ticker, data, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 loading-skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const signalConfig = [
    { key: 'cash_generation', label: 'Cash Generation', icon: DollarSign, desc: 'FCF quality & trends' },
    { key: 'competitive_position', label: 'Competitive Position', icon: Shield, desc: 'Margins & efficiency' },
    { key: 'smart_money', label: 'Smart Money', icon: Users, desc: 'Institutional & insider' },
    { key: 'growth_quality', label: 'Growth Quality', icon: TrendingUp, desc: 'Revenue acceleration' },
    { key: 'valuation_sanity', label: 'Valuation', icon: Target, desc: 'PEG & value metrics' }
  ];

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.03)] rounded-lg border border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="text-sm text-gray-400">Overall Score</div>
          <div className="text-3xl font-bold text-white">{data.overall_score}<span className="text-lg text-gray-500">/100</span></div>
        </div>
        <Badge className={`text-lg px-4 py-2 ${
          data.verdict === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
          data.verdict === 'BUY' ? 'bg-green-500/20 text-green-400' :
          data.verdict === 'HOLD' ? 'bg-yellow-500/20 text-yellow-400' :
          data.verdict === 'CAUTION' ? 'bg-orange-500/20 text-orange-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {data.verdict}
        </Badge>
      </div>

      {/* Individual Signals */}
      <div className="space-y-3">
        {signalConfig.map(({ key, label, icon: Icon, desc }) => {
          const signal = data.signals?.[key];
          if (!signal) return null;
          
          return (
            <div key={key} className="p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#d946ef]" />
                  <span className="text-sm font-medium text-white">{label}</span>
                  <span className="text-xs text-gray-500">({desc})</span>
                </div>
                <GradeBadge grade={signal.grade} />
              </div>
              <SignalBar score={signal.score} maxScore={signal.max_score} label="" />
              
              {/* Key Details */}
              {signal.details && Object.keys(signal.details).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(signal.details).slice(0, 4).map(([k, v]) => (
                    v !== null && k !== 'error' && (
                      <span key={k} className="text-[10px] px-2 py-1 bg-[rgba(255,255,255,0.05)] rounded text-gray-400">
                        {k.replace(/_/g, ' ')}: <span className="text-white">{typeof v === 'number' ? v.toLocaleString() : v}</span>
                      </span>
                    )
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Earnings Intelligence Component
const EarningsIntelligence = ({ ticker, data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 loading-skeleton rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Earnings Prediction */}
      {data.earnings_prediction && (
        <div className="p-4 bg-[rgba(217,70,239,0.1)] rounded-lg border border-[rgba(217,70,239,0.2)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#d946ef]" />
              <span className="font-semibold text-white">Beat Probability</span>
            </div>
            <Badge className={`text-lg px-3 py-1 ${
              data.earnings_prediction.beat_probability >= 70 ? 'bg-green-500/20 text-green-400' :
              data.earnings_prediction.beat_probability >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {data.earnings_prediction.beat_probability}%
            </Badge>
          </div>
          <div className="text-xs text-gray-400">
            Confidence: <span className="text-white capitalize">{data.earnings_prediction.confidence}</span>
          </div>
          {data.earnings_prediction.key_factors?.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.earnings_prediction.key_factors.map((factor, i) => (
                <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-[#d946ef]">•</span>
                  {factor}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historical Surprises */}
      {data.historical_surprises?.length > 0 && (
        <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">Earnings History</span>
            <Badge className="bg-green-500/20 text-green-400">
              {data.beat_rate}% Beat Rate
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {data.historical_surprises.slice(0, 8).map((q, i) => (
              <div key={i} className={`p-2 rounded text-center ${q.beat ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <div className={`text-xs font-bold ${q.beat ? 'text-green-400' : 'text-red-400'}`}>
                  {q.surprise_pct > 0 ? '+' : ''}{q.surprise_pct}%
                </div>
                <div className="text-[10px] text-gray-500">{q.date?.slice(5, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyst Estimates */}
      {data.estimate_revisions && (
        <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="text-sm font-medium text-white mb-3">Analyst Targets</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-gray-500">Low</div>
              <div className="text-sm font-medium text-red-400">
                ${data.estimate_revisions.target_price_low?.toFixed(0) || 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Mean</div>
              <div className="text-sm font-medium text-white">
                ${data.estimate_revisions.target_price_mean?.toFixed(0) || 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">High</div>
              <div className="text-sm font-medium text-green-400">
                ${data.estimate_revisions.target_price_high?.toFixed(0) || 'N/A'}
              </div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <Badge className="capitalize">{data.estimate_revisions.recommendation?.replace('_', ' ') || 'N/A'}</Badge>
            <span className="text-xs text-gray-500 ml-2">({data.estimate_revisions.num_analysts} analysts)</span>
          </div>
        </div>
      )}

      {/* Insider Activity */}
      {data.insider_activity && Object.keys(data.insider_activity).length > 0 && (
        <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="text-sm font-medium text-white mb-3">Insider Activity (90 days)</div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{data.insider_activity.total_buys}</div>
                <div className="text-xs text-gray-500">Buys</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{data.insider_activity.total_sells}</div>
                <div className="text-xs text-gray-500">Sells</div>
              </div>
            </div>
            <Badge className={`capitalize ${
              data.insider_activity.net_sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' :
              data.insider_activity.net_sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {data.insider_activity.net_sentiment}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

// Why Moving Component
const WhyMoving = ({ ticker, data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 loading-skeleton rounded-lg" />
        <div className="h-32 loading-skeleton rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const change = data.change_today || {};
  const isUp = change.direction === 'up';
  const isSignificant = ['significant', 'extreme'].includes(data.movement_strength);

  return (
    <div className="space-y-4">
      {/* Movement Summary */}
      <div className={`p-4 rounded-lg border ${
        isSignificant 
          ? isUp ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isUp ? (
              <TrendingUp className={`w-6 h-6 ${isSignificant ? 'text-green-400' : 'text-gray-400'}`} />
            ) : (
              <TrendingDown className={`w-6 h-6 ${isSignificant ? 'text-red-400' : 'text-gray-400'}`} />
            )}
            <div>
              <div className="text-2xl font-bold text-white">
                {change.change_pct > 0 ? '+' : ''}{change.change_pct?.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400">${change.price?.toFixed(2)}</div>
            </div>
          </div>
          <Badge className={`capitalize ${
            data.movement_strength === 'extreme' ? 'bg-purple-500/20 text-purple-400' :
            data.movement_strength === 'significant' ? 'bg-blue-500/20 text-blue-400' :
            data.movement_strength === 'notable' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {data.movement_strength}
          </Badge>
        </div>
        
        {/* AI Summary */}
        <div className="text-sm text-gray-300 mt-3 p-3 bg-[rgba(0,0,0,0.2)] rounded">
          <Zap className="w-4 h-4 inline mr-2 text-[#d946ef]" />
          {data.ai_summary}
        </div>
      </div>

      {/* Volume Analysis */}
      {change.volume_vs_avg && (
        <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Volume vs Average</span>
            <span className={`text-sm font-medium ${
              change.volume_vs_avg > 2 ? 'text-yellow-400' : 'text-white'
            }`}>
              {change.volume_vs_avg?.toFixed(1)}x
            </span>
          </div>
          <div className="mt-2 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${change.volume_vs_avg > 2 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(change.volume_vs_avg * 33, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Catalysts */}
      {data.potential_catalysts?.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-white">Potential Catalysts</div>
          {data.potential_catalysts.map((catalyst, i) => (
            <div key={i} className={`p-3 rounded-lg border ${
              catalyst.impact === 'high' ? 'bg-[rgba(217,70,239,0.1)] border-[rgba(217,70,239,0.3)]' :
              'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {catalyst.type === 'news' && <Activity className="w-4 h-4 text-blue-400" />}
                  {catalyst.type === 'earnings' && <Calendar className="w-4 h-4 text-purple-400" />}
                  {catalyst.type === 'volume_spike' && <BarChart3 className="w-4 h-4 text-yellow-400" />}
                  {catalyst.type === 'technical' && <Target className="w-4 h-4 text-green-400" />}
                  <span className="text-sm text-white">{catalyst.description}</span>
                </div>
                <Badge className={`text-xs capitalize ${
                  catalyst.impact === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {catalyst.impact}
                </Badge>
              </div>
              
              {/* News details */}
              {catalyst.details && catalyst.type === 'news' && (
                <div className="mt-2 space-y-1 pl-6">
                  {catalyst.details.map((news, j) => (
                    <div key={j} className="text-xs text-gray-400 truncate">
                      • {news.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.potential_catalysts?.length === 0 && (
        <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.06)] text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <div className="text-sm text-gray-400">No obvious catalysts identified</div>
          <div className="text-xs text-gray-500 mt-1">Movement may be due to sector rotation or market sentiment</div>
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
  const [loading, setLoading] = useState({
    signals: false,
    earnings: false,
    moving: false
  });

  const fetchData = async (type) => {
    if (!ticker) return;
    
    setLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      if (type === 'signals') {
        const res = await axios.get(`${API}/api/stocks/${ticker}/five-signals`);
        setFiveSignals(res.data);
      } else if (type === 'earnings') {
        const res = await axios.get(`${API}/api/stocks/${ticker}/earnings-intelligence`);
        setEarningsIntel(res.data);
      } else if (type === 'moving') {
        const res = await axios.get(`${API}/api/stocks/${ticker}/why-moving`);
        setWhyMoving(res.data);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    if (ticker) {
      fetchData('signals');
      fetchData('earnings');
      fetchData('moving');
    }
  }, [ticker]);

  if (!ticker) return null;

  return (
    <Card className="premium-card gold-gradient-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Brain className="w-5 h-5 text-[#d946ef]" />
            Intelligence Hub
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchData('signals');
              fetchData('earnings');
              fetchData('moving');
            }}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="signals" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              5 Signals
            </TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              Earnings Intel
            </TabsTrigger>
            <TabsTrigger value="moving" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Why Moving?
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="mt-0">
            <FiveSignalsAnalysis 
              ticker={ticker} 
              data={fiveSignals} 
              loading={loading.signals}
              onRefresh={() => fetchData('signals')}
            />
          </TabsContent>

          <TabsContent value="earnings" className="mt-0">
            <EarningsIntelligence 
              ticker={ticker} 
              data={earningsIntel} 
              loading={loading.earnings}
            />
          </TabsContent>

          <TabsContent value="moving" className="mt-0">
            <WhyMoving 
              ticker={ticker} 
              data={whyMoving} 
              loading={loading.moving}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IntelligenceHub;
