import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const HealthReportCard = ({ healthReport, loadingHealthReport }) => {
  // Helper to get color class based on trend
  const getTrendColor = (trend) => {
    if (!trend) return 'text-gray-400';
    const t = trend.toLowerCase();
    if (t.includes('up') || t.includes('improving') || t.includes('positive') || t.includes('growth')) return 'text-green-400';
    if (t.includes('down') || t.includes('declining') || t.includes('negative')) return 'text-red-400';
    return 'text-yellow-400';
  };

  // Helper to get verdict badge color
  const getVerdictColor = (verdict) => {
    if (!verdict) return 'bg-gray-500/20 text-gray-400';
    const v = verdict.toLowerCase();
    if (v.includes('strong') || v.includes('buy') || v.includes('bullish')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (v.includes('weak') || v.includes('sell') || v.includes('bearish')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  };

  return (
    <Card className="premium-card gold-gradient-border mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white section-title-gold flex items-center gap-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <span>🧠</span> AI Deep Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingHealthReport ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-[rgba(255,255,255,0.1)] rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-[rgba(255,255,255,0.1)] rounded"></div>
              ))}
            </div>
          </div>
        ) : healthReport ? (
          <div className="space-y-6">
            {/* Verdict */}
            {healthReport.verdict && (
              <div className="flex items-center gap-3">
                <Badge className={`px-4 py-1.5 text-sm font-medium border ${getVerdictColor(healthReport.verdict)}`}>
                  {healthReport.verdict}
                </Badge>
                {healthReport.confidence && (
                  <span className="text-xs text-gray-500">
                    Confidence: {healthReport.confidence}%
                  </span>
                )}
              </div>
            )}

            {/* Core Vitals Matrix */}
            {healthReport.quarters && healthReport.quarters.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#d946ef] flex items-center gap-2">
                  Core Vitals Matrix
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)]">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Metric</th>
                        {healthReport.quarters.map((q, idx) => (
                          <th key={idx} className="text-right py-2 px-3 text-gray-500 font-medium whitespace-nowrap">
                            {q.quarter}
                          </th>
                        ))}
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Revenue */}
                      <tr className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 px-3 text-gray-400">Revenue</td>
                        {healthReport.quarters.map((q, idx) => (
                          <td key={idx} className="text-right py-2 px-3 text-white mono-numbers">
                            {q.revenue ? `$${(q.revenue / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className={`text-right py-2 px-3 ${getTrendColor(healthReport.revenue_trend)}`}>
                          {healthReport.revenue_trend || '-'}
                        </td>
                      </tr>
                      {/* Gross Margin */}
                      <tr className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 px-3 text-gray-400">Gross Margin</td>
                        {healthReport.quarters.map((q, idx) => (
                          <td key={idx} className="text-right py-2 px-3 text-white mono-numbers">
                            {q.gross_margin ? `${(q.gross_margin * 100).toFixed(1)}%` : '-'}
                          </td>
                        ))}
                        <td className={`text-right py-2 px-3 ${getTrendColor(healthReport.margin_trend)}`}>
                          {healthReport.margin_trend || '-'}
                        </td>
                      </tr>
                      {/* Operating Margin */}
                      <tr className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 px-3 text-gray-400">Op. Margin</td>
                        {healthReport.quarters.map((q, idx) => (
                          <td key={idx} className="text-right py-2 px-3 text-white mono-numbers">
                            {q.operating_margin ? `${(q.operating_margin * 100).toFixed(1)}%` : '-'}
                          </td>
                        ))}
                        <td className={`text-right py-2 px-3 ${getTrendColor(healthReport.op_margin_trend)}`}>
                          {healthReport.op_margin_trend || '-'}
                        </td>
                      </tr>
                      {/* Net Income */}
                      <tr className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 px-3 text-gray-400">Net Income</td>
                        {healthReport.quarters.map((q, idx) => (
                          <td key={idx} className="text-right py-2 px-3 text-white mono-numbers">
                            {q.net_income ? `$${(q.net_income / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className={`text-right py-2 px-3 ${getTrendColor(healthReport.income_trend)}`}>
                          {healthReport.income_trend || '-'}
                        </td>
                      </tr>
                      {/* FCF */}
                      <tr className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-2 px-3 text-gray-400">FCF</td>
                        {healthReport.quarters.map((q, idx) => (
                          <td key={idx} className="text-right py-2 px-3 text-white mono-numbers">
                            {q.fcf ? `$${(q.fcf / 1e9).toFixed(1)}B` : '-'}
                          </td>
                        ))}
                        <td className={`text-right py-2 px-3 ${getTrendColor(healthReport.fcf_trend)}`}>
                          {healthReport.fcf_trend || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk Scorecard */}
            {healthReport.risk_scorecard && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#d946ef] flex items-center gap-2">
                  Risk Scorecard
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(healthReport.risk_scorecard).map(([key, value]) => (
                    <div key={key} className="p-3 bg-[rgba(255,255,255,0.02)] rounded-lg">
                      <div className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</div>
                      <div className={`text-sm font-medium mt-1 ${
                        value === 'Low' ? 'text-green-400' : 
                        value === 'Medium' ? 'text-yellow-400' : 
                        'text-red-400'
                      }`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sentiment */}
            {healthReport.sentiment && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#d946ef] flex items-center gap-2">
                  Sentiment
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {healthReport.sentiment}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Health report not available for this stock.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthReportCard;
