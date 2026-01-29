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

// Option 1: Pulsing Brain with Data Streams
export const BrainAnalyzing = ({ message }) => {
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
        {/* Outer glow ring */}
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#d946ef]/20 animate-ping" />
        {/* Brain icon */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <span className="text-5xl animate-pulse">🧠</span>
        </div>
        {/* Orbiting data points */}
        <div className="absolute inset-0 w-20 h-20 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute -top-2 left-1/2 w-2 h-2 bg-green-400 rounded-full" />
          <div className="absolute top-1/2 -right-2 w-2 h-2 bg-blue-400 rounded-full" />
          <div className="absolute -bottom-2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
          <div className="absolute top-1/2 -left-2 w-2 h-2 bg-pink-400 rounded-full" />
        </div>
      </div>
      <p className="text-sm text-[#d946ef] mt-6 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex gap-1 mt-3">
        {[0, 1, 2].map(i => (
          <div 
            key={i} 
            className="w-2 h-2 bg-[#d946ef] rounded-full animate-bounce" 
            style={{ animationDelay: `${i * 150}ms` }} 
          />
        ))}
      </div>
    </div>
  );
};

// Option 2: Stock Chart Being Drawn
export const ChartDrawing = ({ message }) => {
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
        {/* Chart base */}
        <svg className="w-full h-full" viewBox="0 0 128 80">
          {/* Grid lines */}
          <path d="M10,70 H120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M10,50 H120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M10,30 H120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {/* Animated chart line */}
          <path 
            d="M10,60 Q30,50 50,55 T90,30 T120,35"
            stroke="#d946ef"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className="animate-draw-line"
          />
          {/* Moving dot */}
          <circle r="4" fill="#d946ef" className="animate-follow-path">
            <animateMotion dur="2s" repeatCount="indefinite" path="M10,60 Q30,50 50,55 T90,30 T120,35" />
          </circle>
        </svg>
        {/* Sparkles */}
        <span className="absolute -top-2 right-0 text-lg animate-pulse">✨</span>
        <span className="absolute bottom-0 left-0 text-sm animate-pulse" style={{ animationDelay: '500ms' }}>📊</span>
      </div>
      <p className="text-sm text-[#d946ef] mt-4 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="w-48 h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d946ef] to-[#f0abfc] rounded-full animate-progress-bar" />
      </div>
    </div>
  );
};

// Option 3: AI Robot Processing
export const RobotProcessing = ({ message }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => { clearInterval(msgInterval); clearInterval(dotInterval); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        {/* Robot */}
        <div className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>🤖</div>
        {/* Processing indicators */}
        <div className="absolute -right-4 top-0 flex flex-col gap-1">
          <span className="text-xs bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded animate-pulse">01</span>
          <span className="text-xs bg-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded animate-pulse" style={{ animationDelay: '200ms' }}>10</span>
          <span className="text-xs bg-pink-500/30 text-pink-400 px-1.5 py-0.5 rounded animate-pulse" style={{ animationDelay: '400ms' }}>11</span>
        </div>
        {/* Gear */}
        <div className="absolute -left-3 -bottom-1 text-2xl animate-spin" style={{ animationDuration: '2s' }}>⚙️</div>
      </div>
      <p className="text-sm text-[#d946ef] mt-4 font-medium">{message || LOADING_MESSAGES[messageIndex]}{dots}</p>
      <p className="text-xs text-gray-500 mt-2">AI Engine Processing</p>
    </div>
  );
};

// Option 4: Number Crunching Calculator
export const NumberCrunching = ({ message }) => {
  const [numbers, setNumbers] = useState(['$124.5B', '32.4%', '+15.2%', '$8.2B']);
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    const numInterval = setInterval(() => {
      setNumbers(prev => prev.map(() => {
        const types = ['$', '%', '+', '-'];
        const type = types[Math.floor(Math.random() * types.length)];
        const num = (Math.random() * 100).toFixed(1);
        return type === '$' ? `$${num}B` : type === '%' ? `${num}%` : `${type}${num}%`;
      }));
    }, 300);
    const msgInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => { clearInterval(numInterval); clearInterval(msgInterval); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="grid grid-cols-2 gap-2 mb-4">
        {numbers.map((num, i) => (
          <div 
            key={i} 
            className="px-3 py-2 bg-[rgba(255,255,255,0.05)] rounded border border-[rgba(255,255,255,0.1)] text-center"
          >
            <span className={`text-sm font-mono ${
              num.startsWith('+') ? 'text-green-400' : 
              num.startsWith('-') ? 'text-red-400' : 
              'text-[#d946ef]'
            }`}>
              {num}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm text-[#d946ef] font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xl">🧮</span>
        <span className="text-xs text-gray-500">Processing financial metrics</span>
      </div>
    </div>
  );
};

// Option 5: Magnifying Glass Searching
export const DeepSearch = ({ message }) => {
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
        <span className="text-6xl animate-search-move">🔍</span>
        {/* Documents being searched */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          <span className="text-2xl animate-pulse">📄</span>
          <span className="text-2xl animate-pulse" style={{ animationDelay: '300ms' }}>📊</span>
          <span className="text-2xl animate-pulse" style={{ animationDelay: '600ms' }}>📈</span>
        </div>
      </div>
      <p className="text-sm text-[#d946ef] mt-6 font-medium">{message || LOADING_MESSAGES[messageIndex]}</p>
      <div className="flex gap-0.5 mt-3">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="w-1.5 h-6 bg-[#d946ef]/30 rounded-full animate-equalizer"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default {
  brain: BrainAnalyzing,
  chart: ChartDrawing,
  robot: RobotProcessing,
  numbers: NumberCrunching,
  search: DeepSearch,
};
