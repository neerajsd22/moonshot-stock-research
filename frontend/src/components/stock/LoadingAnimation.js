import { Card, CardContent } from '@/components/ui/card';

const LoadingAnimation = ({ ticker }) => {
  return (
    <div className="fade-in" data-testid="stock-loading-animation">
      <Card className="premium-card gold-gradient-border overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Animated Rocket */}
            <div className="relative">
              <div className="animate-bounce">
                <div className="text-6xl">🚀</div>
              </div>
              {/* Trailing stars */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                <span className="text-yellow-400 animate-ping" style={{ animationDelay: '0ms' }}>✨</span>
                <span className="text-yellow-400 animate-ping" style={{ animationDelay: '150ms' }}>✨</span>
                <span className="text-yellow-400 animate-ping" style={{ animationDelay: '300ms' }}>✨</span>
              </div>
            </div>
            
            {/* Loading text */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Fetching <span className="text-[#d946ef]">{ticker}</span>
              </h3>
              <p className="text-gray-400 text-sm">Preparing your moonshot data...</p>
            </div>
            
            {/* Animated progress bar */}
            <div className="w-64 h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#d946ef] via-[#f0abfc] to-[#d946ef] rounded-full"
                style={{
                  animation: 'shimmer 1.5s ease-in-out infinite',
                  backgroundSize: '200% 100%'
                }}
              />
            </div>
            
            {/* Fun loading messages */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>Analyzing market data • Crunching numbers • Almost there!</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingAnimation;
