import { useState, useEffect } from 'react';

// Loading messages that cycle through
const LOADING_MESSAGES = [
  "Crunching 8 quarters of data...",
  "Analyzing revenue trends...",
  "Calculating margin health...",
  "Evaluating cash flow quality...",
  "Assessing risk factors...",
  "Generating investment verdict...",
];

// Option 1: Rocket with Chart (Stock/Finance focused)
export const RocketChart = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#d946ef]/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="relative">
            <span className="text-5xl">📈</span>
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">🚀</span>
          </div>
        </div>
        <div className="absolute inset-0 w-24 h-24 animate-spin" style={{ animationDuration: '4s' }}>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2"><span className="text-sm">💰</span></div>
          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2"><span className="text-sm">📊</span></div>
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2"><span className="text-sm">💹</span></div>
          <div className="absolute top-1/2 -left-3 transform -translate-y-1/2"><span className="text-sm">🎯</span></div>
        </div>
      </div>
      <p className="text-sm text-[#d946ef] mt-6 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="w-48 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d946ef] via-[#f0abfc] to-[#d946ef] rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">Analyzing financial health...</p>
    </div>
  );
};

// Option 2: Magnifying Glass with Documents (Research focused)
export const ResearchAnalysis = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="text-6xl animate-pulse">🔬</div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
          <span className="text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>📑</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '200ms' }}>📊</span>
          <span className="text-2xl animate-bounce" style={{ animationDelay: '400ms' }}>📈</span>
        </div>
        <span className="absolute -top-1 -right-1 text-xl animate-ping">✨</span>
      </div>
      <p className="text-sm text-[#d946ef] mt-8 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex gap-1 mt-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="w-2 h-8 bg-[#d946ef]/30 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms`, height: `${12 + Math.random() * 16}px` }} />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Deep diving into financials...</p>
    </div>
  );
};

// Option 3: Calculator with Gears (Number crunching focused)
export const CalculatorGears = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [numbers, setNumbers] = useState(['$124B', '32.4%', '+15%', '$8.2B']);
  
  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    const numInterval = setInterval(() => {
      setNumbers(prev => prev.map(() => {
        const types = ['$', '%', '+'];
        const type = types[Math.floor(Math.random() * types.length)];
        const num = (Math.random() * 100).toFixed(1);
        return type === '$' ? `$${num}B` : `${type}${num}%`;
      }));
    }, 400);
    return () => { clearInterval(msgInterval); clearInterval(numInterval); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <span className="text-6xl">🧮</span>
        <span className="absolute -top-2 -left-2 text-2xl animate-spin" style={{ animationDuration: '2s' }}>⚙️</span>
        <span className="absolute -bottom-2 -right-2 text-xl animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>⚙️</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-6">
        {numbers.map((num, i) => (
          <div key={i} className="px-3 py-1.5 bg-[rgba(255,255,255,0.05)] rounded border border-[rgba(255,255,255,0.1)]">
            <span className={`text-sm font-mono ${num.startsWith('+') ? 'text-green-400' : 'text-[#d946ef]'}`}>{num}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-[#d946ef] mt-4 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <p className="text-xs text-gray-500 mt-2">Processing financial metrics...</p>
    </div>
  );
};

// Option 4: Target with Stats (Goal/Analysis focused)
export const TargetAnalysis = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-[#d946ef]/30 flex items-center justify-center animate-pulse">
          <div className="w-14 h-14 rounded-full border-4 border-[#d946ef]/50 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#d946ef] flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
          </div>
        </div>
        <span className="absolute -top-1 right-0 text-xl animate-bounce">💡</span>
        <span className="absolute -bottom-1 left-0 text-lg animate-pulse">📊</span>
      </div>
      <p className="text-sm text-[#d946ef] mt-6 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex gap-2 mt-4">
        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Revenue ↑</span>
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Margins ↑</span>
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">FCF ↑</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">Locking in on key metrics...</p>
    </div>
  );
};

// Option 5: Crystal Ball (Prediction focused)
export const CrystalBall = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-purple-500/20 animate-pulse blur-xl" />
        <div className="relative text-6xl animate-bounce" style={{ animationDuration: '2s' }}>🔮</div>
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <span className="text-sm animate-ping">✨</span>
        </div>
        <div className="absolute top-1/2 -right-4 transform -translate-y-1/2">
          <span className="text-xl">📈</span>
        </div>
        <div className="absolute top-1/2 -left-4 transform -translate-y-1/2">
          <span className="text-xl">💰</span>
        </div>
      </div>
      <p className="text-sm text-[#d946ef] mt-6 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="w-48 h-1 bg-[rgba(255,255,255,0.1)] rounded-full mt-4 overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">Forecasting financial future...</p>
    </div>
  );
};

// Option 6: Pulse Monitor (Health check focused) - RECOMMENDED
export const PulseMonitor = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-32 h-20">
        <svg className="w-full h-full" viewBox="0 0 128 80">
          <path d="M0,40 L20,40 L25,20 L35,60 L45,30 L55,50 L60,40 L128,40" 
            stroke="#d946ef" strokeWidth="3" fill="none" strokeLinecap="round"
            className="animate-draw-pulse" />
        </svg>
        <span className="absolute top-0 right-0 text-2xl animate-pulse">💓</span>
        <span className="absolute bottom-0 left-0 text-lg">📊</span>
      </div>
      <p className="text-sm text-[#d946ef] mt-4 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex items-center gap-2 mt-3">
        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-gray-400">Scanning vital signs...</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">Checking financial health...</p>
    </div>
  );
};

// Keep BrainAnalyzing as alias for default (now uses RocketChart)
export const BrainAnalyzing = RocketChart;

export default {
  rocket: RocketChart,
  research: ResearchAnalysis,
  calculator: CalculatorGears,
  target: TargetAnalysis,
  crystal: CrystalBall,
  pulse: PulseMonitor,
};
