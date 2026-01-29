import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AnalysisCard = ({ bullBearSentiment, loadingBullBear }) => {
  return (
    <Card className="premium-card gold-gradient-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingBullBear ? (
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-1/4"></div>
              <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded w-full"></div>
              <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded w-3/4"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-1/4"></div>
              <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded w-full"></div>
              <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded w-3/4"></div>
            </div>
          </div>
        ) : bullBearSentiment ? (
          <>
            {/* Bull Case */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐂</span>
                <h4 className="text-sm font-medium text-green-400">Bull Case</h4>
              </div>
              <ul className="space-y-1.5">
                {bullBearSentiment.bull_points?.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-xs text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-green-400">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Bear Case */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐻</span>
                <h4 className="text-sm font-medium text-red-400">Bear Case</h4>
              </div>
              <ul className="space-y-1.5">
                {bullBearSentiment.bear_points?.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-xs text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-red-400">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">Analysis not available</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisCard;
