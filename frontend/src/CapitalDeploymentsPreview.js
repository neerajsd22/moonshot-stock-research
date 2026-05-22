import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CapitalDeployments from '@/components/intelligence/CapitalDeployments';

// ── Mock fixtures ─────────────────────────────────────────────────────────
const MOCK = {
  NVDA: {
    ticker: 'NVDA',
    is_13f_filer: true,
    filing_date: 'Aug 14, 2024',
    new_this_quarter: [
      { ticker: 'ARM', name: 'Arm Holdings plc', value_usd: 248_000_000, shares: 1_960_000, badge: 'NEW' },
      { ticker: 'SOUN', name: 'SoundHound AI Inc.', value_usd: 8_000_000, shares: 1_730_000, badge: 'NEW' },
      { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', value_usd: 76_000_000, shares: 7_700_000, badge: 'TOPUP', qoq_change_pct: 24 },
    ],
    current_book: [
      { ticker: 'ARM', name: 'Arm Holdings plc', value_usd: 248_000_000, shares: 1_960_000 },
      { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', value_usd: 76_000_000, shares: 7_700_000, badge: 'TOPUP', qoq_change_pct: 24 },
      { ticker: 'SOUN', name: 'SoundHound AI Inc.', value_usd: 8_000_000, shares: 1_730_000 },
      { ticker: 'NNOX', name: 'Nano-X Imaging Ltd.', value_usd: 300_000, shares: 130_000 },
      { ticker: 'TEM', name: 'Tempus AI Inc.', value_usd: 4_200_000, shares: 280_000, badge: 'NEW' },
      { ticker: 'SERV', name: 'Serve Robotics Inc.', value_usd: 2_100_000, shares: 450_000, badge: 'TOPUP', qoq_change_pct: 12 },
      { ticker: 'WIMI', name: 'WiMi Hologram Cloud', value_usd: 880_000, shares: 750_000, badge: 'TOPUP', qoq_change_pct: -8 },
    ],
    acquisitions: [
      {
        date: 'Apr 24, 2024',
        target_name: 'Run:ai Labs Ltd.',
        deal_size_text: '~$700M (est.)',
        filing_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=8-K',
      },
      {
        date: 'Jul 09, 2024',
        target_name: 'Shoreline.io',
        deal_size_text: 'undisclosed',
        filing_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001045810&type=8-K',
      },
    ],
  },
  AAPL: {
    ticker: 'AAPL',
    is_13f_filer: false,
    filing_date: null,
    new_this_quarter: [],
    current_book: [],
    acquisitions: [
      {
        date: 'Jun 12, 2024',
        target_name: 'DarwinAI',
        deal_size_text: 'undisclosed',
        filing_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=8-K',
      },
      {
        date: 'Mar 03, 2024',
        target_name: 'WhyLabs (rumored)',
        deal_size_text: 'undisclosed',
        filing_url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193&type=8-K',
      },
    ],
  },
  TSLA: {
    ticker: 'TSLA',
    is_13f_filer: false,
    filing_date: null,
    new_this_quarter: [],
    current_book: [],
    acquisitions: [],
  },
};

const PRESETS = [
  { key: 'NVDA', label: 'NVDA — 13F filer + acquisitions' },
  { key: 'AAPL', label: 'AAPL — non-filer, M&A only' },
  { key: 'TSLA', label: 'TSLA — empty (both sections)' },
  { key: 'LOADING', label: 'Loading state' },
];

const CapitalDeploymentsPreview = () => {
  const [active, setActive] = useState('NVDA');

  const data = active === 'LOADING' ? null : MOCK[active];
  const loading = active === 'LOADING';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(10,10,15,0.85)] border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            data-testid="preview-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <div className="flex-1" />
          <h1
            className="text-sm font-bold gold-text"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Capital Deployments — Preview
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Preset switcher */}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Try a state</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                data-testid={`preview-preset-${p.key}`}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                  active === p.key
                    ? 'bg-[rgba(217,70,239,0.18)] border-[rgba(217,70,239,0.5)] text-[#f0abfc]'
                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* The module itself, inside a card that mimics the Intelligence Hub accordion body */}
        <div
          className="rounded-xl border border-[rgba(217,70,239,0.2)] bg-[rgba(15,15,20,0.6)] p-3 sm:p-4"
          data-testid="preview-card"
        >
          {/* Accordion-style header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-[#d946ef]">▾</span>
              <span
                className="text-sm font-semibold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Capital Deployments
              </span>
            </div>
            {data && (
              <span className="text-[10px] text-gray-500">
                {data.is_13f_filer ? '13F filer' : 'Non-filer'} ·{' '}
                {data.acquisitions.length} acquisition{data.acquisitions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <CapitalDeployments data={data} loading={loading} />
        </div>

        <p className="text-[10px] text-gray-600 italic text-center">
          This page renders the component with mocked data only. Real wiring to{' '}
          <code className="text-gray-400">/api/stocks/:ticker/capital-deployments</code> happens
          after you sign off on the visual.
        </p>
      </main>
    </div>
  );
};

export default CapitalDeploymentsPreview;
