import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-base sm:text-lg font-semibold text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {title}
    </h3>
    <div className="text-sm text-gray-300 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Bullet = ({ children }) => (
  <li className="flex gap-2 text-sm text-gray-300">
    <span className="text-[#d946ef] mt-1 flex-shrink-0">▸</span>
    <span>{children}</span>
  </li>
);

const AboutUs = () => {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Fade/slide out the button once the user scrolls past 240px,
  // and bring it back when they scroll near the top.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setHidden(window.scrollY > 240);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    // Prevent background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Floating trigger button — bottom-left, hides on scroll */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="about-us-button"
        aria-label="About Us"
        data-hidden={hidden ? 'true' : 'false'}
        className={`fixed bottom-20 right-4 sm:bottom-20 sm:right-6 z-40 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
                   bg-[rgba(15,15,20,0.85)] backdrop-blur-md
                   border border-[rgba(217,70,239,0.35)] hover:border-[#d946ef]
                   text-xs sm:text-sm text-gray-300 hover:text-white
                   shadow-[0_4px_16px_rgba(217,70,239,0.15)] hover:shadow-[0_6px_24px_rgba(217,70,239,0.35)]
                   transition-all duration-300 hover:-translate-y-0.5
                   ${hidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d946ef]" />
        <span>About Us</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm fade-in"
          data-testid="about-us-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto
                       bg-[rgba(10,10,15,0.98)] border border-[rgba(217,70,239,0.25)]
                       rounded-t-2xl sm:rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)]
                       gold-gradient-border"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 sm:p-6 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,15,0.98)] backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">📈</span>
                <h2
                  className="text-xl sm:text-2xl font-bold gold-text"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  About Us
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                data-testid="about-us-close"
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-6">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Welcome to <span className="font-semibold text-white">Moonshot</span> — an AI-powered stock research platform built to help investors make smarter, faster decisions.
              </p>

              <p className="text-sm text-gray-300 leading-relaxed">
                Modern markets move quickly, and investors are flooded with financial data, news, and opinions every day. Our mission is simple:
              </p>

              <div className="p-4 rounded-lg bg-[rgba(217,70,239,0.06)] border border-[rgba(217,70,239,0.25)]">
                <p className="text-sm sm:text-base text-white italic">
                  Make stock analysis easier, faster, and more accessible for everyone.
                </p>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                Using advanced AI and real-time market insights, our platform helps users:
              </p>

              <ul className="space-y-1.5">
                <Bullet>Search and explore stocks instantly</Bullet>
                <Bullet>Access AI-generated stock analysis</Bullet>
                <Bullet>Understand market trends and sentiment</Bullet>
                <Bullet>Review key financial and technical indicators</Bullet>
                <Bullet>Simplify complex financial information</Bullet>
              </ul>

              <p className="text-sm text-gray-300 leading-relaxed">
                Whether you’re a beginner investor or an experienced trader, we aim to help you cut through the noise and focus on meaningful insights.
              </p>

              <Section title="Why We Built This">
                <p>
                  Traditional financial research tools are often expensive, complicated, and designed for institutions. We believe powerful market intelligence should be available to everyone.
                </p>
                <p>
                  Our goal is to democratize investing through intelligent, data-driven analysis powered by AI.
                </p>
              </Section>

              <Section title="Our Philosophy">
                <p>We focus on three core principles:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    { label: 'Clarity', desc: 'Simple, understandable insights' },
                    { label: 'Speed', desc: 'Faster research and decision-making' },
                    { label: 'Intelligence', desc: 'AI-powered analysis backed by real market data' },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] hover:border-[#d946ef]/40 transition-colors"
                    >
                      <div className="text-sm font-semibold text-[#d946ef] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {p.label}
                      </div>
                      <div className="text-xs text-gray-400">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Looking Ahead">
                <p>
                  We believe AI will transform how people invest and understand financial markets. Our platform is continuously evolving with smarter analytics, improved insights, and better tools for investors.
                </p>
              </Section>

              <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)]">
                <div className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Disclaimer
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Moonshot provides AI-generated analysis for informational and educational purposes only and does not provide financial or investment advice. Always conduct your own research before making investment decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AboutUs;
