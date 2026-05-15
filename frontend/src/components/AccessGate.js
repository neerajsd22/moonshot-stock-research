import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, Key, ArrowRight, BrainCircuit, Radar, BarChart3, Layers, Grid3X3, TrendingDown, Shield, Eye, Fish, Zap, ArrowDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import confetti from 'canvas-confetti';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Scroll-triggered fade-in hook
const useScrollReveal = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  return [ref, isVisible];
};

// Reusable animated section wrapper
const RevealSection = ({ children, className = '', delay = 0 }) => {
  const [ref, isVisible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const AccessGate = ({ children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const accessCodeRef = useRef(null);

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#d946ef', '#f0abfc', '#c026d3', '#a855f7', '#e879f9'];

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < animationEnd) requestAnimationFrame(frame);
    };

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    frame();
  }, []);

  useEffect(() => {
    const storedCode = localStorage.getItem('access_code');
    if (storedCode) {
      verifyCode(storedCode, true);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyCode = async (code, silent = false) => {
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/access/verify`, {
        code: code.toUpperCase(),
        skip_decrement: silent,
      });
      if (response.data.valid) {
        localStorage.setItem('access_code', code.toUpperCase());
        if (!silent) {
          setShowConfetti(true);
          triggerConfetti();
          toast.success('Welcome to Moonshot!');
          setTimeout(() => { setShowConfetti(false); setHasAccess(true); }, 3000);
        } else {
          setHasAccess(true);
        }
      } else {
        if (!silent) toast.error('Invalid access code');
        localStorage.removeItem('access_code');
      }
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.detail || 'Invalid access code');
      localStorage.removeItem('access_code');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!accessCode.trim()) { toast.error('Please enter an access code'); return; }
    verifyCode(accessCode);
  };

  const scrollToAccess = () => {
    accessCodeRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-[#d946ef] animate-pulse" />
          <p className="text-gray-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (showConfetti) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center animate-bounce-in">
          <TrendingUp className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 text-[#d946ef]" />
          <h1 className="text-3xl sm:text-5xl font-bold gold-text mb-3 sm:mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome!
          </h1>
          <p className="text-base sm:text-xl text-gray-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Get ready to discover your next big win...
          </p>
        </div>
      </div>
    );
  }

  if (hasAccess) return children;

  // ─── Landing Page ───
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden" data-testid="access-gate">

      {/* ── Section 1: Hero ── */}
      <section className="min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center px-4 relative">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#d946ef]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <TrendingUp className="w-10 h-10 sm:w-14 sm:h-14 text-[#d946ef]" data-testid="hero-logo-icon" />
            <h1
              className="text-4xl sm:text-6xl lg:text-7xl font-bold gold-text"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="hero-title"
            >
              Moonshot
            </h1>
          </div>

          <p
            className="text-lg sm:text-2xl text-gray-400 mb-3"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
            data-testid="hero-tagline"
          >
            Discover Your Next Big Win
          </p>
          <p className="text-sm sm:text-base text-gray-500 mb-8 sm:mb-12 max-w-md mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Smart stock analysis powered by real-time data and artificial intelligence. Built for investors who think ahead.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            <Button
              onClick={scrollToAccess}
              className="btn-premium px-8 py-3 text-base"
              data-testid="hero-cta-button"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              onClick={scrollToAccess}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              Already have a code? <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown className="w-5 h-5 text-gray-600" />
        </div>
      </section>

      {/* ── Section 2: AI Deep Analysis Spotlight ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="text-center mb-6 sm:mb-8">
              <Badge className="bg-[#d946ef]/10 text-[#d946ef] border border-[#d946ef]/30 mb-4 text-xs px-3 py-1">
                Core Feature
              </Badge>
              <h2
                className="text-2xl sm:text-4xl font-bold text-white mb-3"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid="ai-analysis-heading"
              >
                AI Deep Analysis
              </h2>
              <p className="text-sm sm:text-lg text-gray-400 max-w-lg mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Eight quarters of financial data, distilled into clear verdicts you can act on.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={150}>
            <Card className="bg-[rgba(15,15,20,0.8)] border border-[rgba(217,70,239,0.2)] backdrop-blur-sm overflow-hidden">
              <CardContent className="p-5 sm:p-8">
                {/* Mock Analysis Preview */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#d946ef]/10 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-[#d946ef]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm sm:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>Health Report</div>
                    <div className="text-xs text-gray-500">8-Quarter Comprehensive Review</div>
                  </div>
                  <div className="ml-auto">
                    <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-sm sm:text-base font-bold px-3 py-1">
                      BUY
                    </Badge>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>Overall Score</span>
                    <span className="text-[#d946ef] font-semibold">8.5 / 10</span>
                  </div>
                  <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d946ef] to-[#f0abfc] rounded-full" style={{ width: '85%' }} />
                  </div>
                </div>

                {/* Key Capabilities */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: TrendingUp, label: 'Revenue Trends', desc: 'Quarter-over-quarter growth tracking' },
                    { icon: Shield, label: 'Risk Scorecard', desc: 'Volatility and downside assessment' },
                    { icon: Zap, label: 'Buy / Hold / Sell', desc: 'Clear actionable verdicts' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3 border border-[rgba(255,255,255,0.05)]">
                      <Icon className="w-4 h-4 text-[#d946ef] mb-2" />
                      <div className="text-xs font-medium text-white mb-0.5">{label}</div>
                      <div className="text-[11px] text-gray-500">{desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </RevealSection>
        </div>
      </section>

      {/* ── Section 3: Intelligence Hub Spotlight ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <div className="text-center mb-6 sm:mb-8">
              <Badge className="bg-[#d946ef]/10 text-[#d946ef] border border-[#d946ef]/30 mb-4 text-xs px-3 py-1">
                Intelligence Suite
              </Badge>
              <h2
                className="text-2xl sm:text-4xl font-bold text-white mb-3"
                style={{ fontFamily: 'Outfit, sans-serif' }}
                data-testid="intelligence-hub-heading"
              >
                Intelligence Hub
              </h2>
              <p className="text-sm sm:text-lg text-gray-400 max-w-lg mx-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Six powerful modules working together to surface insights that matter, before everyone else sees them.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={150}>
            <Card className="bg-[rgba(15,15,20,0.8)] border border-[rgba(217,70,239,0.2)] backdrop-blur-sm overflow-hidden">
              <CardContent className="p-5 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#d946ef]/10 flex items-center justify-center">
                    <Radar className="w-5 h-5 sm:w-6 sm:h-6 text-[#d946ef]" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm sm:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>6 Intelligence Modules</div>
                    <div className="text-xs text-gray-500">Real-time signals, filings, and pattern detection</div>
                  </div>
                </div>

                {/* Module List */}
                <div className="space-y-2.5">
                  {[
                    { icon: Zap, name: '5 Signals Framework', desc: 'Technical momentum, value, growth, quality, and sentiment indicators combined into one view' },
                    { icon: BarChart3, name: 'Pre-Earnings Intelligence', desc: 'Automated analysis reports generated 3 to 5 days before a company reports earnings' },
                    { icon: TrendingDown, name: 'Why Is This Moving?', desc: 'Identifies catalysts behind sudden price swings using news and market data' },
                    { icon: Eye, name: 'Insider Alerts', desc: 'Tracks executive and director stock purchases and sales in real time' },
                    { icon: Fish, name: 'Whale Watch', desc: 'Monitors 13F filings to reveal what institutional investors are buying and selling' },
                    { icon: Grid3X3, name: 'Similar Stocks', desc: 'Finds companies with matching characteristics so you can discover new opportunities' },
                  ].map(({ icon: Icon, name, desc }, i) => (
                    <RevealSection key={name} delay={200 + i * 80}>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(217,70,239,0.2)] transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-[#d946ef]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-[#d946ef]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
                        </div>
                      </div>
                    </RevealSection>
                  ))}
                </div>
              </CardContent>
            </Card>
          </RevealSection>
        </div>
      </section>

      {/* ── Section 4: More Features ── */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <RevealSection>
            <h3
              className="text-lg sm:text-2xl font-semibold text-white text-center mb-6 sm:mb-8"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Everything Else You Need
            </h3>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Layers, title: 'Stack and Compare', desc: 'Load up to 10 stocks side by side. Pin your favorites for quick access anytime.' },
              { icon: BarChart3, title: 'Interactive Charts', desc: 'Real-time price charts with multiple time periods, Y-axis labels, and comparison overlays.' },
              { icon: Grid3X3, title: 'Smart Categories', desc: 'Browse stocks by sector, index, or create your own custom watchlists.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <RevealSection key={title} delay={i * 100}>
                <Card className="bg-[rgba(15,15,20,0.6)] border border-[rgba(255,255,255,0.06)] h-full">
                  <CardContent className="p-4 sm:p-5">
                    <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-sm font-medium text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>

          {/* Stats Strip */}
          <RevealSection delay={200}>
            <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-center">
              {[
                { value: '500+', label: 'Stocks Covered' },
                { value: '6', label: 'Intelligence Modules' },
                { value: '8', label: 'Quarters Analyzed' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-xl sm:text-2xl font-bold text-[#d946ef]" style={{ fontFamily: 'DM Mono, monospace' }}>{value}</div>
                  <div className="text-[11px] sm:text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Section 5: Access Code ── */}
      <section ref={accessCodeRef} className="py-16 sm:py-24 px-4 pb-24 sm:pb-32">
        <div className="max-w-md mx-auto">
          <RevealSection>
            <div className="text-center mb-6 sm:mb-8">
              <h2
                className="text-xl sm:text-3xl font-bold text-white mb-2"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Ready for Liftoff?
              </h2>
              <p className="text-sm text-gray-400" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Enter your access code to start analyzing.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <Card className="premium-card gold-gradient-border">
              <CardHeader className="text-center pb-2">
                <CardTitle className="flex items-center justify-center gap-2 text-white text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Key className="w-5 h-5 text-[#d946ef]" />
                  Enter Access Code
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  This app is invite-only. Enter your code to continue.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="XXXXXXXX"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="input-premium text-center text-2xl tracking-[0.3em] uppercase text-white"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                    maxLength={8}
                    data-testid="access-code-input"
                  />
                  <Button
                    type="submit"
                    className="w-full btn-premium"
                    disabled={verifying || !accessCode.trim()}
                    data-testid="access-submit"
                  >
                    {verifying ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 purple-spinner" />
                        Verifying...
                      </span>
                    ) : (
                      <>
                        Launch
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Need an access code? Contact the app owner.
                </p>
              </CardContent>
            </Card>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] py-6 px-4 text-center">
        <p className="text-xs text-gray-600" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Moonshot — Smart stock analysis for forward-thinking investors.
        </p>
      </footer>
    </div>
  );
};

export default AccessGate;
